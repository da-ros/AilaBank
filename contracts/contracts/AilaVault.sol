// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AilaVault
 * @notice Core vault for storing user USDC deposits and tracking accrued yield
 * @dev Integrates with LiquidityBuffer and YieldAllocator for complete money management
 */
contract AilaVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========== STATE VARIABLES ==========

    /// @notice Role for admin operations (pause, upgrade)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role for yield allocation operations
    bytes32 public constant YIELD_MANAGER_ROLE = keccak256("YIELD_MANAGER_ROLE");

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice User principal balances (deposits - withdrawals)
    mapping(address => uint256) public userBalances;

    /// @notice User accrued yield
    mapping(address => uint256) public userYield;

    /// @notice Last block when yield was updated for user
    mapping(address => uint256) public lastYieldUpdate;

    /// @notice Total USDC deposited across all users
    uint256 public totalUSDCDeposited;

    /// @notice Total yield distributed to users
    uint256 public totalYieldDistributed;

    /// @notice Reference to LiquidityBuffer contract
    address public liquidityBuffer;

    /// @notice Reference to YieldAllocator contract
    address public yieldAllocator;

    /// @notice Circuit breaker: max withdrawal as % of TVL (e.g., 10%)
    uint256 public maxWithdrawalPercent = 10;

    // ========== EVENTS ==========

    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed user, uint256 amount, address toAddress, uint256 timestamp);
    event Withdrawal(address indexed user, uint256 amount, uint256 yieldDeducted);
    event YieldAccrued(address indexed user, uint256 amount, uint256 totalYield);
    event EmergencyWithdrawal(address indexed admin, address indexed user, uint256 amount);
    event LiquidityBufferSet(address indexed buffer);
    event YieldAllocatorSet(address indexed allocator);
    event MaxWithdrawalPercentUpdated(uint256 newPercent);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    // ========== ERRORS ==========

    error InsufficientBalance();
    error InvalidAmount();
    error InvalidAddress();
    error WithdrawalExceedsLimit();
    error ContractNotSet();

    // ========== CONSTRUCTOR ==========

    /**
     * @notice Initialize the vault with USDC token
     * @param _usdc Address of USDC token on Arc
     * @param _admin Initial admin address
     */
    constructor(address _usdc, address _admin) {
        if (_usdc == address(0) || _admin == address(0)) revert InvalidAddress();
        
        usdc = IERC20(_usdc);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(YIELD_MANAGER_ROLE, _admin);
    }

    // ========== DEPOSIT FUNCTION ==========

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (in wei, 6 decimals for USDC)
     * @dev User must approve vault to spend USDC first
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from user to vault
        // SafeERC20 handles return value and reverts on failure
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        userBalances[msg.sender] += amount;
        totalUSDCDeposited += amount;

        // Update yield tracking timestamp
        lastYieldUpdate[msg.sender] = block.timestamp;

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Get total balance for user (principal + yield)
     * @param user Address to query
     * @return Total balance in USDC
     */
    function getBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    /**
     * @notice Get total balance including yield for a user
     * @param user User address
     * @return Total balance (principal + yield)
     */
    function getTotalBalance(address user) external view returns (uint256) {
        return userBalances[user] + userYield[user];
    }

    /**
     * @notice Get detailed balance breakdown
     * @param user Address to query
     * @return principal User's deposited amount
     * @return yield User's accrued yield
     * @return total Sum of principal and yield
     */
    function getBalanceDetails(address user) 
        external 
        view 
        returns (uint256 principal, uint256 yield, uint256 total) 
    {
        principal = userBalances[user];
        yield = userYield[user];
        total = principal + yield;
    }

    // ========== WITHDRAWAL FUNCTION ==========

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount to withdraw
     * @dev First attempts to withdraw from buffer, then unwinds yield if needed
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        uint256 totalBalance = userBalances[msg.sender] + userYield[msg.sender];
        if (amount > totalBalance) revert InsufficientBalance();

        // Circuit breaker: prevent withdrawals >10% of TVL
        uint256 maxWithdrawal = (totalUSDCDeposited * maxWithdrawalPercent) / 100;
        if (amount > maxWithdrawal) revert WithdrawalExceedsLimit();

        // Calculate yield deducted for event
        uint256 yieldDeducted = 0;
        if (amount <= userYield[msg.sender]) {
            yieldDeducted = amount;
        } else {
            yieldDeducted = userYield[msg.sender];
        }

        // Deduct from yield first, then principal
        if (amount <= userYield[msg.sender]) {
            userYield[msg.sender] -= amount;
        } else {
            uint256 remainingAfterYield = amount - userYield[msg.sender];
            userYield[msg.sender] = 0;
            userBalances[msg.sender] -= remainingAfterYield;
        }

        totalUSDCDeposited -= amount;

        // Try to withdraw from buffer first
        if (liquidityBuffer != address(0)) {
            // Call buffer to handle the withdrawal
            (bool success, ) = liquidityBuffer.call(
                abi.encodeWithSignature("withdrawFromBuffer(address,uint256)", msg.sender, amount)
            );
            
            if (success) {
                emit Withdrawal(msg.sender, amount, yieldDeducted);
                return;
            }
            // If buffer doesn't have liquidity, fall through to direct transfer
        }

        // Direct transfer from vault (fallback if buffer not set or insufficient)
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount, yieldDeducted);
    }

    /**
     * @notice Emergency withdraw for admin (bypasses circuit breaker)
     * @param user User to withdraw for
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address user, uint256 amount) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (amount == 0) revert InvalidAmount();
        
        uint256 totalBalance = userBalances[user] + userYield[user];
        if (amount > totalBalance) revert InsufficientBalance();

        // Deduct from balance
        if (amount <= userYield[user]) {
            userYield[user] -= amount;
        } else {
            uint256 remainingAfterYield = amount - userYield[user];
            userYield[user] = 0;
            userBalances[user] -= remainingAfterYield;
        }

        totalUSDCDeposited -= amount;

        // Direct transfer
        usdc.safeTransfer(user, amount);

        emit EmergencyWithdrawal(msg.sender, user, amount);
    }

    // ========== YIELD MANAGEMENT ==========

    /**
     * @notice Accumulate yield for a user
     * @param user Address to credit yield to
     * @param yieldAmount Amount of yield earned
     * @dev Only callable by YieldAllocator contract
     */
    function accumulateYield(address user, uint256 yieldAmount) 
        external 
        onlyRole(YIELD_MANAGER_ROLE) 
    {
        if (yieldAmount == 0) return;

        userYield[user] += yieldAmount;
        totalYieldDistributed += yieldAmount;
        lastYieldUpdate[user] = block.timestamp;

        emit YieldAccrued(user, yieldAmount, userYield[user]);
    }

    /**
     * @notice Batch accumulate yield for multiple users
     * @param users Array of user addresses
     * @param yieldAmounts Array of yield amounts (must match users length)
     */
    function batchAccumulateYield(address[] calldata users, uint256[] calldata yieldAmounts)
        external
        onlyRole(YIELD_MANAGER_ROLE)
    {
        require(users.length == yieldAmounts.length, "Array length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            if (yieldAmounts[i] == 0) continue;

            userYield[users[i]] += yieldAmounts[i];
            totalYieldDistributed += yieldAmounts[i];
            lastYieldUpdate[users[i]] = block.timestamp;

            emit YieldAccrued(users[i], yieldAmounts[i], userYield[users[i]]);
        }
    }

    /**
     * @notice Get user's APY based on yield earned
     * @param user Address to query
     * @return APY percentage (scaled by 100, e.g., 500 = 5%)
     */
    function getUserAPY(address user) external view returns (uint256) {
        if (userBalances[user] == 0) return 0;
        if (lastYieldUpdate[user] == 0) return 0;

        uint256 timeElapsed = block.timestamp - lastYieldUpdate[user];
        if (timeElapsed == 0) return 0;

        // APY = (yield / principal) * (365 days / time elapsed) * 100
        uint256 secondsPerYear = 365 days;
        uint256 apyScaled = (userYield[user] * secondsPerYear * 10000) / 
                            (userBalances[user] * timeElapsed);

        return apyScaled; // Returns basis points (e.g., 500 = 5%)
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the LiquidityBuffer contract address
     * @param _buffer Address of LiquidityBuffer
     */
    function setLiquidityBuffer(address _buffer) external onlyRole(ADMIN_ROLE) {
        if (_buffer == address(0)) revert InvalidAddress();
        liquidityBuffer = _buffer;
        emit LiquidityBufferSet(_buffer);
    }

    /**
     * @notice Set the YieldAllocator contract address
     * @param _allocator Address of YieldAllocator
     */
    function setYieldAllocator(address _allocator) external onlyRole(ADMIN_ROLE) {
        if (_allocator == address(0)) revert InvalidAddress();
        yieldAllocator = _allocator;
        
        // Grant YIELD_MANAGER_ROLE to the allocator
        _grantRole(YIELD_MANAGER_ROLE, _allocator);
        
        emit YieldAllocatorSet(_allocator);
    }

    /**
     * @notice Update circuit breaker threshold
     * @param newPercent New max withdrawal percent (e.g., 10 for 10%)
     */
    function setMaxWithdrawalPercent(uint256 newPercent) external onlyRole(ADMIN_ROLE) {
        require(newPercent > 0 && newPercent <= 100, "Invalid percent");
        maxWithdrawalPercent = newPercent;
        emit MaxWithdrawalPercentUpdated(newPercent);
    }

    /**
     * @notice Pause all deposits and withdrawals
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Get total value locked (TVL) in vault
     * @return TVL in USDC
     */
    function getTVL() external view returns (uint256) {
        return totalUSDCDeposited + totalYieldDistributed;
    }

    /**
     * @notice Get contract health metrics
     * @return deposited Total USDC deposited
     * @return yieldDistributed Total yield distributed
     * @return vaultBalance Actual USDC balance in vault
     */
    function getHealthMetrics() 
        external 
        view 
        returns (uint256 deposited, uint256 yieldDistributed, uint256 vaultBalance) 
    {
        deposited = totalUSDCDeposited;
        yieldDistributed = totalYieldDistributed;
        vaultBalance = usdc.balanceOf(address(this));
    }
}
