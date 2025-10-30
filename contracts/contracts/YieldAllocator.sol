// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title YieldAllocator
 * @notice Manages USDC allocation to DeFi yield strategies
 * @dev Allocates idle vault funds to Aave, Compound, Uniswap pools for yield generation
 */
contract YieldAllocator is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ========== STATE VARIABLES ==========

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    IERC20 public immutable usdc;
    address public ailaVault;
    address public liquidityBuffer;

    // Pool tracking
    struct YieldPool {
        address poolAddress;      // Pool contract address
        string poolType;          // "aave", "compound", "uniswap", etc.
        uint256 allocatedAmount;  // USDC allocated to this pool
        uint256 currentValue;     // Current value including yield
        uint256 targetPercent;    // Target allocation % (e.g., 40 = 40%)
        uint256 lastRebalance;    // Last rebalance timestamp
        bool isActive;            // Whether pool is active
    }

    mapping(bytes32 => YieldPool) public yieldPools; // poolId => YieldPool
    bytes32[] public poolIds;                         // Array of all pool IDs

    uint256 public totalAllocated;      // Total USDC allocated to all pools
    uint256 public totalYieldGenerated; // Lifetime yield generated
    uint256 public lastYieldDistribution; // Last yield distribution timestamp

    // Allocation limits
    uint256 public maxAllocationPercent = 80; // Max 80% of vault can be allocated
    uint256 public minPoolPercent = 5;        // Min 5% per pool
    uint256 public maxPoolPercent = 40;       // Max 40% per pool

    // ========== EVENTS ==========

    event PoolAdded(bytes32 indexed poolId, address poolAddress, string poolType, uint256 targetPercent);
    event PoolUpdated(bytes32 indexed poolId, uint256 newTargetPercent, bool isActive);
    event FundsAllocated(bytes32 indexed poolId, uint256 amount, uint256 timestamp);
    event FundsUnwound(bytes32 indexed poolId, uint256 amount, uint256 yield, uint256 timestamp);
    event YieldDistributed(uint256 totalYield, uint256 toVault, uint256 toBuffer, uint256 timestamp);
    event Rebalanced(uint256 totalAllocated, uint256 timestamp);
    event AllocationLimitsUpdated(uint256 maxAllocation, uint256 minPool, uint256 maxPool);
    event VaultSet(address indexed vault);
    event BufferSet(address indexed buffer);

    // ========== ERRORS ==========

    error InvalidAmount();
    error InvalidAddress();
    error InvalidPercent();
    error PoolNotFound();
    error PoolAlreadyExists();
    error AllocationExceeded();
    error InsufficientFunds();

    // ========== CONSTRUCTOR ==========

    constructor(address _usdc, address _admin) {
        if (_usdc == address(0) || _admin == address(0)) revert InvalidAddress();
        
        usdc = IERC20(_usdc);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(STRATEGY_MANAGER_ROLE, _admin);
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * @notice Add new yield pool
     * @param poolId Unique identifier for pool
     * @param poolAddress Pool contract address
     * @param poolType Type of pool (aave, compound, etc.)
     * @param targetPercent Target allocation percentage
     */
    function addPool(
        bytes32 poolId,
        address poolAddress,
        string memory poolType,
        uint256 targetPercent
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (poolAddress == address(0)) revert InvalidAddress();
        if (yieldPools[poolId].poolAddress != address(0)) revert PoolAlreadyExists();
        if (targetPercent < minPoolPercent || targetPercent > maxPoolPercent) {
            revert InvalidPercent();
        }

        yieldPools[poolId] = YieldPool({
            poolAddress: poolAddress,
            poolType: poolType,
            allocatedAmount: 0,
            currentValue: 0,
            targetPercent: targetPercent,
            lastRebalance: block.timestamp,
            isActive: true
        });

        poolIds.push(poolId);

        emit PoolAdded(poolId, poolAddress, poolType, targetPercent);
    }

    /**
     * @notice Update pool configuration
     * @param poolId Pool identifier
     * @param newTargetPercent New target allocation percent
     * @param isActive Whether pool is active
     */
    function updatePool(
        bytes32 poolId,
        uint256 newTargetPercent,
        bool isActive
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        YieldPool storage pool = yieldPools[poolId];
        if (pool.poolAddress == address(0)) revert PoolNotFound();

        if (newTargetPercent > 0) {
            if (newTargetPercent < minPoolPercent || newTargetPercent > maxPoolPercent) {
                revert InvalidPercent();
            }
            pool.targetPercent = newTargetPercent;
        }

        pool.isActive = isActive;

        emit PoolUpdated(poolId, newTargetPercent, isActive);
    }

    /**
     * @notice Allocate USDC to yield pool
     * @param poolId Pool to allocate to
     * @param amount Amount of USDC to allocate
     */
    function allocateToPool(bytes32 poolId, uint256 amount)
        external
        onlyRole(STRATEGY_MANAGER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert InvalidAmount();
        
        YieldPool storage pool = yieldPools[poolId];
        if (pool.poolAddress == address(0)) revert PoolNotFound();
        if (!pool.isActive) revert PoolNotFound();

        // Transfer USDC from vault or buffer to this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // TODO: Integrate with actual DeFi protocol (Aave, Compound, etc.)
        // For MVP, we'll just hold the USDC and simulate yield
        
        pool.allocatedAmount += amount;
        pool.currentValue += amount;
        pool.lastRebalance = block.timestamp;
        totalAllocated += amount;

        emit FundsAllocated(poolId, amount, block.timestamp);
    }

    /**
     * @notice Unwind position from pool (withdraw for user withdrawals)
     * @param poolId Pool to unwind from
     * @param amount Amount needed
     * @return unwoundAmount Actual amount withdrawn (may include yield)
     */
    function unwindFromPool(bytes32 poolId, uint256 amount)
        external
        onlyRole(VAULT_ROLE)
        nonReentrant
        returns (uint256 unwoundAmount)
    {
        if (amount == 0) revert InvalidAmount();

        YieldPool storage pool = yieldPools[poolId];
        if (pool.poolAddress == address(0)) revert PoolNotFound();
        if (pool.currentValue < amount) revert InsufficientFunds();

        // TODO: Integrate with actual DeFi protocol withdrawal
        // For MVP, withdraw from contract balance

        uint256 yieldGenerated = 0;
        if (pool.currentValue > pool.allocatedAmount) {
            // Calculate yield earned
            uint256 totalYield = pool.currentValue - pool.allocatedAmount;
            yieldGenerated = (totalYield * amount) / pool.currentValue;
        }

        pool.allocatedAmount -= (amount - yieldGenerated);
        pool.currentValue -= amount;
        totalAllocated -= (amount - yieldGenerated);
        totalYieldGenerated += yieldGenerated;

        // Transfer USDC to vault
        usdc.safeTransfer(msg.sender, amount);

        emit FundsUnwound(poolId, amount, yieldGenerated, block.timestamp);

        return amount;
    }

    /**
     * @notice Harvest yield from all pools and distribute
     * @dev Called periodically to collect yield and send to vault/buffer
     */
    function harvestYield()
        external
        onlyRole(STRATEGY_MANAGER_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 totalYield)
    {
        uint256 harvestedYield = 0;

        for (uint256 i = 0; i < poolIds.length; i++) {
            bytes32 poolId = poolIds[i];
            YieldPool storage pool = yieldPools[poolId];

            if (!pool.isActive) continue;

            // TODO: Query actual yield from DeFi protocols
            // For MVP, simulate yield accumulation (e.g., 5% APY)
            
            if (pool.allocatedAmount > 0) {
                uint256 timeElapsed = block.timestamp - pool.lastRebalance;
                // Simulate 5% APY: (principal * 5 * timeElapsed) / (100 * 365 days)
                uint256 simulatedYield = (pool.allocatedAmount * 5 * timeElapsed) / (100 * 365 days);
                
                pool.currentValue += simulatedYield;
                harvestedYield += simulatedYield;
                pool.lastRebalance = block.timestamp;
            }
        }

        if (harvestedYield > 0) {
            totalYieldGenerated += harvestedYield;
            
            // Split yield: 80% to vault users, 20% to buffer
            uint256 toVault = (harvestedYield * 80) / 100;
            uint256 toBuffer = harvestedYield - toVault;

            // Transfer to vault for user yield distribution
            if (ailaVault != address(0)) {
                usdc.safeTransfer(ailaVault, toVault);
            }

            // Transfer to buffer for liquidity
            if (liquidityBuffer != address(0)) {
                usdc.safeTransfer(liquidityBuffer, toBuffer);
            }

            lastYieldDistribution = block.timestamp;

            emit YieldDistributed(harvestedYield, toVault, toBuffer, block.timestamp);
        }

        return harvestedYield;
    }

    /**
     * @notice Rebalance allocations across pools to match target percentages
     * @param vaultTVL Current TVL from vault
     */
    function rebalancePools(uint256 vaultTVL)
        external
        onlyRole(STRATEGY_MANAGER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (vaultTVL == 0) return;

        // TODO: Implement actual rebalancing logic
        // Calculate target allocation: (vaultTVL * maxAllocationPercent) / 100
        // For MVP, just emit event
        
        emit Rebalanced(totalAllocated, block.timestamp);
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
     * @notice Set LiquidityBuffer contract address
     * @param _buffer Address of LiquidityBuffer
     */
    function setLiquidityBuffer(address _buffer) external onlyRole(ADMIN_ROLE) {
        if (_buffer == address(0)) revert InvalidAddress();
        liquidityBuffer = _buffer;
        emit BufferSet(_buffer);
    }

    /**
     * @notice Update allocation limits
     * @param _maxAllocation Max % of vault that can be allocated
     * @param _minPool Min % per pool
     * @param _maxPool Max % per pool
     */
    function setAllocationLimits(
        uint256 _maxAllocation,
        uint256 _minPool,
        uint256 _maxPool
    ) external onlyRole(ADMIN_ROLE) {
        if (_maxAllocation > 90) revert InvalidPercent(); // Max 90% allocation
        if (_minPool == 0 || _maxPool == 0) revert InvalidPercent();
        if (_minPool >= _maxPool) revert InvalidPercent();

        maxAllocationPercent = _maxAllocation;
        minPoolPercent = _minPool;
        maxPoolPercent = _maxPool;

        emit AllocationLimitsUpdated(_maxAllocation, _minPool, _maxPool);
    }

    /**
     * @notice Pause allocator operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause allocator operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get pool information
     * @param poolId Pool identifier
     * @return pool YieldPool struct
     */
    function getPool(bytes32 poolId) external view returns (YieldPool memory pool) {
        return yieldPools[poolId];
    }

    /**
     * @notice Get all active pool IDs
     * @return activePoolIds Array of active pool identifiers
     */
    function getActivePools() external view returns (bytes32[] memory activePoolIds) {
        uint256 activeCount = 0;
        
        // Count active pools
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (yieldPools[poolIds[i]].isActive) {
                activeCount++;
            }
        }

        // Build array of active pool IDs
        activePoolIds = new bytes32[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (yieldPools[poolIds[i]].isActive) {
                activePoolIds[index] = poolIds[i];
                index++;
            }
        }

        return activePoolIds;
    }

    /**
     * @notice Get total value locked across all pools
     * @return tvl Total value including yield
     */
    function getTotalValue() external view returns (uint256 tvl) {
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            totalValue += yieldPools[poolIds[i]].currentValue;
        }

        return totalValue;
    }

    /**
     * @notice Get allocator health metrics
     * @return allocated Total allocated principal
     * @return currentValue Total current value with yield
     * @return yieldGenerated Lifetime yield generated
     */
    function getMetrics()
        external
        view
        returns (uint256 allocated, uint256 currentValue, uint256 yieldGenerated)
    {
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            totalValue += yieldPools[poolIds[i]].currentValue;
        }

        return (totalAllocated, totalValue, totalYieldGenerated);
    }

    /**
     * @notice Calculate overall APY across all pools
     * @return apy APY in basis points (e.g., 500 = 5%)
     */
    function getOverallAPY() external view returns (uint256 apy) {
        if (totalAllocated == 0) return 0;
        if (lastYieldDistribution == 0) return 0;

        uint256 timeElapsed = block.timestamp - lastYieldDistribution;
        if (timeElapsed == 0) return 0;

        // Calculate annualized return
        uint256 apyScaled = (totalYieldGenerated * 365 days * 10000) / (totalAllocated * timeElapsed);
        
        return apyScaled;
    }
}
