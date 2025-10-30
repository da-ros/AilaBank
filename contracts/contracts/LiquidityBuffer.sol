// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LiquidityBuffer
 * @notice Manages instant withdrawal buffer for AilaVault
 * @dev Maintains 10-20% TVL buffer, triggers rebalancing when low
 */
contract LiquidityBuffer is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ========== STATE VARIABLES ==========

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    IERC20 public immutable usdc;
    address public ailaVault;
    address public yieldAllocator;

    uint256 public bufferBalance; // Current USDC in buffer
    uint256 public maxBufferPercent = 20; // Max buffer as % of TVL
    uint256 public minBufferPercent = 10; // Min buffer as % of TVL
    uint256 public totalWithdrawn; // Lifetime withdrawals from buffer
    uint256 public totalRebalanced; // Lifetime rebalances

    // ========== EVENTS ==========

    event BufferWithdrawal(address indexed user, uint256 amount, uint256 remainingBuffer);
    event BufferRebalanced(uint256 amountAdded, uint256 newBalance, uint256 timestamp);
    event BufferThresholdsUpdated(uint256 minPercent, uint256 maxPercent);
    event VaultSet(address indexed vault);
    event YieldAllocatorSet(address indexed allocator);
    event EmergencyDrain(address indexed admin, uint256 amount, address to);

    // ========== ERRORS ==========

    error InsufficientBuffer();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidThresholds();
    error Unauthorized();

    // ========== CONSTRUCTOR ==========

    constructor(address _usdc, address _admin) {
        if (_usdc == address(0) || _admin == address(0)) revert InvalidAddress();
        
        usdc = IERC20(_usdc);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(REBALANCER_ROLE, _admin);
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * @notice Withdraw USDC from buffer for instant user withdrawal
     * @param user User requesting withdrawal
     * @param amount Amount to withdraw
     * @return success Whether withdrawal was successful
     */
    function withdrawFromBuffer(address user, uint256 amount) 
        external 
        onlyRole(VAULT_ROLE) 
        nonReentrant 
        whenNotPaused 
        returns (bool success) 
    {
        if (amount == 0) revert InvalidAmount();
        if (user == address(0)) revert InvalidAddress();

        // Check if buffer has sufficient balance
        if (bufferBalance < amount) {
            return false; // Signal vault to trigger unwinding
        }

        // Update buffer balance
        bufferBalance -= amount;
        totalWithdrawn += amount;

        // Transfer USDC to user
        usdc.safeTransfer(user, amount);

        emit BufferWithdrawal(user, amount, bufferBalance);

        return true;
    }

    /**
     * @notice Check if buffer needs rebalancing
     * @param vaultTVL Current TVL from AilaVault
     * @return needsRebalance Whether buffer is below minimum threshold
     * @return targetAmount Amount needed to reach max buffer
     */
    function checkRebalanceNeeded(uint256 vaultTVL) 
        external 
        view 
        returns (bool needsRebalance, uint256 targetAmount) 
    {
        uint256 minBuffer = (vaultTVL * minBufferPercent) / 100;
        uint256 maxBuffer = (vaultTVL * maxBufferPercent) / 100;

        if (bufferBalance < minBuffer) {
            needsRebalance = true;
            targetAmount = maxBuffer - bufferBalance;
        }

        return (needsRebalance, targetAmount);
    }

    /**
     * @notice Rebalance buffer by adding USDC from yield allocator
     * @param amount Amount to add to buffer
     */
    function rebalanceBuffer(uint256 amount) 
        external 
        onlyRole(REBALANCER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from yield allocator (or admin) to buffer
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        bufferBalance += amount;
        totalRebalanced += amount;

        emit BufferRebalanced(amount, bufferBalance, block.timestamp);
    }

    /**
     * @notice Batch deposit to buffer (used during vault deposits)
     * @param amount Amount to add to buffer
     */
    function addToBuffer(uint256 amount) 
        external 
        onlyRole(VAULT_ROLE) 
        nonReentrant 
    {
        if (amount == 0) return;

        // Expect USDC to already be transferred to this contract
        bufferBalance += amount;

        emit BufferRebalanced(amount, bufferBalance, block.timestamp);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set AilaVault contract address
     * @param _vault Address of AilaVault
     */
    function setAilaVault(address _vault) external onlyRole(ADMIN_ROLE) {
        if (_vault == address(0)) revert InvalidAddress();
        ailaVault = _vault;
        _grantRole(VAULT_ROLE, _vault);
        emit VaultSet(_vault);
    }

    /**
     * @notice Set YieldAllocator contract address
     * @param _allocator Address of YieldAllocator
     */
    function setYieldAllocator(address _allocator) external onlyRole(ADMIN_ROLE) {
        if (_allocator == address(0)) revert InvalidAddress();
        yieldAllocator = _allocator;
        _grantRole(REBALANCER_ROLE, _allocator);
        emit YieldAllocatorSet(_allocator);
    }

    /**
     * @notice Update buffer thresholds
     * @param _minPercent New minimum buffer percent
     * @param _maxPercent New maximum buffer percent
     */
    function setBufferThresholds(uint256 _minPercent, uint256 _maxPercent) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_minPercent == 0 || _maxPercent == 0) revert InvalidThresholds();
        if (_minPercent >= _maxPercent) revert InvalidThresholds();
        if (_maxPercent > 50) revert InvalidThresholds(); // Max 50% buffer

        minBufferPercent = _minPercent;
        maxBufferPercent = _maxPercent;

        emit BufferThresholdsUpdated(_minPercent, _maxPercent);
    }

    /**
     * @notice Emergency drain buffer to admin
     * @param amount Amount to drain
     * @param to Recipient address
     */
    function emergencyDrain(uint256 amount, address to) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (to == address(0)) revert InvalidAddress();
        if (amount > bufferBalance) revert InsufficientBuffer();

        bufferBalance -= amount;
        usdc.safeTransfer(to, amount);

        emit EmergencyDrain(msg.sender, amount, to);
    }

    /**
     * @notice Pause buffer operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause buffer operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get buffer health metrics
     * @return balance Current buffer balance
     * @return withdrawn Total withdrawn from buffer
     * @return rebalanced Total rebalanced into buffer
     */
    function getBufferMetrics() 
        external 
        view 
        returns (uint256 balance, uint256 withdrawn, uint256 rebalanced) 
    {
        return (bufferBalance, totalWithdrawn, totalRebalanced);
    }

    /**
     * @notice Calculate buffer utilization percentage
     * @param vaultTVL Current TVL from vault
     * @return utilization Buffer balance as % of TVL (scaled by 100)
     */
    function getBufferUtilization(uint256 vaultTVL) 
        external 
        view 
        returns (uint256 utilization) 
    {
        if (vaultTVL == 0) return 0;
        return (bufferBalance * 100) / vaultTVL;
    }
}
