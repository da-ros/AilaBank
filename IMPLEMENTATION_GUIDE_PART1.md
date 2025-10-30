# 🛠️ AilaBank — Implementation Guide (Resource-Integrated)

**This document is your step-by-step implementation handbook.**

---

## PART 1: PROJECT INITIALIZATION & SETUP

### Step 1.1: Create Folder Structure

```bash
cd /home/ramspheld/Projects/Ramspheld/aila

# Create main directories
mkdir -p contracts/{src/{interfaces,libraries},test,scripts,abi}
mkdir -p indexer/src
mkdir -p frontend/src/{hooks,components,pages,utils,__tests__}
mkdir -p docs
mkdir -p backend  # (Pedro's territory, but scaffold here)

# Create essential config files
touch contracts/.env.example
touch indexer/.env.example
touch frontend/.env.local.example
touch .gitignore
touch README.md
```

### Step 1.2: Root Package.json (Monorepo Setup)

```json
{
  "name": "aila",
  "version": "0.1.0",
  "description": "AilaBank: AI-Native Stablecoin Banking on Arc",
  "private": true,
  "scripts": {
    "contracts:build": "cd contracts && npm run build",
    "contracts:test": "cd contracts && npm test",
    "contracts:deploy": "cd contracts && npx hardhat run scripts/deploy.ts --network arc_testnet",
    "indexer:start": "cd indexer && npm start",
    "frontend:dev": "cd frontend && npm run dev",
    "frontend:build": "cd frontend && npm run build",
    "setup": "npm install && npm run setup:contracts && npm run setup:indexer && npm run setup:frontend",
    "setup:contracts": "cd contracts && npm install",
    "setup:indexer": "cd indexer && npm install",
    "setup:frontend": "cd frontend && npm install"
  },
  "keywords": ["AI", "Banking", "Blockchain", "USDC", "Arc"],
  "author": "Ramspheld",
  "license": "MIT"
}
```

---

## PART 2: SMART CONTRACTS SETUP

### Step 2.1: Contracts Package.json

**File: `contracts/package.json`**

```json
{
  "name": "@aila/contracts",
  "version": "0.1.0",
  "scripts": {
    "build": "hardhat compile",
    "test": "hardhat test",
    "test:gas": "REPORT_GAS=true hardhat test",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network arc_testnet",
    "deploy:local": "hardhat run scripts/deploy.ts --network hardhat",
    "verify": "hardhat verify",
    "clean": "hardhat clean",
    "slither": "slither . --json artifacts/slither-report.json",
    "mythx": "mythx analyze contracts/src/*.sol"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^3.0.0",
    "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
    "@nomiclabs/hardhat-etherscan": "^3.1.7",
    "hardhat": "^2.17.0",
    "ethers": "^6.7.1",
    "chai": "^4.3.7",
    "ts-node": "^10.9.1",
    "typescript": "^5.1.6",
    "@openzeppelin/contracts": "^5.0.0",
    "@openzeppelin/hardhat-upgrades": "^2.0.0"
  },
  "dependencies": {
    "dotenv": "^16.3.1"
  }
}
```

### Step 2.2: Hardhat Configuration

**File: `contracts/hardhat.config.ts`**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Local testing network (default)
    },
    arc_testnet: {
      url: process.env.ARC_TESTNET_RPC || "https://testnet.arc.io/rpc",
      chainId: 91002, // Arc testnet chain ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000 // 1 Gwei (adjust based on actual Arc gas prices)
    },
    arc_mainnet: {
      url: process.env.ARC_MAINNET_RPC || "https://mainnet.arc.io/rpc",
      chainId: 91001, // Arc mainnet chain ID
      accounts: process.env.PRIVATE_KEY_MAINNET ? [process.env.PRIVATE_KEY_MAINNET] : []
    }
  },
  etherscan: {
    apiKey: {
      arc_testnet: process.env.BLOCK_EXPLORER_KEY || "",
      arc_mainnet: process.env.BLOCK_EXPLORER_KEY || ""
    },
    customChains: [
      {
        network: "arc_testnet",
        chainId: 91002,
        urls: {
          apiURL: "https://testnet.arc.io/api",
          browserURL: "https://testnet.arc.io"
        }
      },
      {
        network: "arc_mainnet",
        chainId: 91001,
        urls: {
          apiURL: "https://mainnet.arc.io/api",
          browserURL: "https://mainnet.arc.io"
        }
      }
    ]
  },
  paths: {
    sources: "./src",
    tests: "./test",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 200000 // 200 seconds for long-running tests
  }
};

export default config;
```

### Step 2.3: Environment File

**File: `contracts/.env.example`**

```bash
# Arc Testnet
ARC_TESTNET_RPC=https://testnet.arc.io/rpc
PRIVATE_KEY=0x1234567890abcdef...  # Your testnet private key
BLOCK_EXPLORER_KEY=your_block_explorer_api_key

# Arc Mainnet (Phase 4)
ARC_MAINNET_RPC=https://mainnet.arc.io/rpc
PRIVATE_KEY_MAINNET=0x1234567890abcdef...  # Your mainnet private key

# USDC Faucet
USDC_FAUCET_URL=https://faucet.circle.com
USDC_ADDRESS_TESTNET=0x...  # USDC contract on Arc testnet

# Oracle Addresses (Phase 2+)
CHAINLINK_ORACLE_ADDRESS=0x...
BAND_ORACLE_ADDRESS=0x...

# Multisig & Governance (Phase 3+)
MULTISIG_ADDRESS=0x...
TIMELOCK_ADDRESS=0x...
```

---

## PART 3: SMART CONTRACT IMPLEMENTATION

### Step 3.1: AilaVault.sol (Core Contract)

**File: `contracts/src/AilaVault.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AilaVault
 * @notice Core vault contract for user USDC deposits and yield tracking on Arc
 * @dev Stores user balances, accrued yield, and handles deposit/withdrawal operations
 */
contract AilaVault is AccessControl, Pausable, ReentrancyGuard {
    // ============ State Variables ============

    IERC20 public immutable usdc;
    
    // User balance tracking (USDC deposited)
    mapping(address => uint256) public userBalances;
    
    // Yield accrued per user
    mapping(address => uint256) public userYield;
    
    // Last block when yield was updated
    mapping(address => uint256) public lastYieldUpdate;
    
    // Total USDC deposited across all users
    uint256 public totalUSDCDeposited;
    
    // Total yield distributed
    uint256 public totalYieldDistributed;
    
    // Yield rate (e.g., 5% APY = 50 basis points per day)
    uint256 public yieldRatePerDay = 1370; // ~5% APY (1370 bps / 365)
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");

    // ============ Events ============

    event Deposit(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event Withdraw(
        address indexed user,
        uint256 amount,
        address indexed toAddress,
        uint256 timestamp
    );

    event YieldAccrued(
        address indexed user,
        uint256 amount,
        uint256 totalYield,
        uint256 timestamp
    );

    event YieldRateUpdated(uint256 newRate);

    event BalanceTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    // ============ Constructor ============

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        
        usdc = IERC20(_usdc);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ Deposit Function ============

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (in 6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Deposit amount must be > 0");
        
        // Transfer USDC from user to vault
        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        require(success, "USDC transfer failed");
        
        // Update user balance
        userBalances[msg.sender] += amount;
        totalUSDCDeposited += amount;
        
        // Initialize yield tracking
        if (lastYieldUpdate[msg.sender] == 0) {
            lastYieldUpdate[msg.sender] = block.number;
        }
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }

    // ============ Withdraw Function ============

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Withdraw amount must be > 0");
        
        uint256 balance = getBalance(msg.sender);
        require(balance >= amount, "Insufficient balance");
        
        // Deduct from user balance (yield first, then principal)
        uint256 yieldAccrued = userYield[msg.sender];
        
        if (amount <= yieldAccrued) {
            userYield[msg.sender] -= amount;
        } else {
            userYield[msg.sender] = 0;
            userBalances[msg.sender] -= (amount - yieldAccrued);
        }
        
        totalUSDCDeposited -= amount;
        
        // Transfer USDC to user
        bool success = usdc.transfer(msg.sender, amount);
        require(success, "USDC transfer failed");
        
        emit Withdraw(msg.sender, amount, msg.sender, block.timestamp);
    }

    // ============ Yield Accumulation ============

    /**
     * @notice Accumulate yield for a user (called by AI orchestrator or scheduler)
     * @param user User address
     * @param yieldAmount Amount of yield to add (already in USDC)
     */
    function accumulateYield(address user, uint256 yieldAmount) 
        external 
        onlyRole(ALLOCATOR_ROLE) 
        nonReentrant 
    {
        require(user != address(0), "Invalid user address");
        require(yieldAmount > 0, "Yield amount must be > 0");
        
        userYield[user] += yieldAmount;
        totalYieldDistributed += yieldAmount;
        lastYieldUpdate[user] = block.number;
        
        emit YieldAccrued(user, yieldAmount, userYield[user], block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get total balance (principal + yield) for a user
     */
    function getBalance(address user) external view returns (uint256) {
        return userBalances[user] + userYield[user];
    }

    /**
     * @notice Get vault statistics
     */
    function getVaultStats() external view returns (
        uint256 totalDeposited,
        uint256 totalYield,
        uint256 totalBalance
    ) {
        return (
            totalUSDCDeposited,
            totalYieldDistributed,
            totalUSDCDeposited + totalYieldDistributed
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Update yield rate (basis points per day)
     */
    function setYieldRate(uint256 newRate) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newRate <= 5000, "Rate too high (max 50% APY)");
        yieldRatePerDay = newRate;
        emit YieldRateUpdated(newRate);
    }

    /**
     * @notice Grant ALLOCATOR_ROLE to YieldAllocator contract
     */
    function grantAllocatorRole(address allocator) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(allocator != address(0), "Invalid allocator");
        _grantRole(ALLOCATOR_ROLE, allocator);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Resume operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ Emergency Rescue (for stuck funds) ============

    /**
     * @notice Emergency withdrawal of stuck USDC (admin only)
     */
    function emergencyWithdraw(uint256 amount) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        bool success = usdc.transfer(msg.sender, amount);
        require(success, "Transfer failed");
    }
}
```

### Step 3.2: LiquidityBuffer.sol

**File: `contracts/src/LiquidityBuffer.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LiquidityBuffer
 * @notice Holds reserved USDC (10-20% of total vault) for instant user withdrawals
 */
contract LiquidityBuffer is AccessControl, Pausable {
    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public ailaVault;
    address public yieldAllocator;
    
    uint256 public bufferBalance;
    uint256 public maxBufferPercent = 20; // 20% max
    uint256 public minBufferPercent = 10; // 10% min
    uint256 public totalVaultSize; // Synced from AilaVault
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ Events ============

    event BufferDeposit(uint256 amount, uint256 newBalance);
    event BufferWithdraw(uint256 amount, address recipient, uint256 newBalance);
    event BufferTopUpRequested(uint256 needed);
    event VaultSizeUpdated(uint256 newSize);

    // ============ Constructor ============

    constructor(address _usdc, address _vault) {
        require(_usdc != address(0), "Invalid USDC");
        require(_vault != address(0), "Invalid vault");
        
        usdc = IERC20(_usdc);
        ailaVault = _vault;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ Deposit to Buffer ============

    function deposit(uint256 amount) external {
        require(msg.sender == ailaVault || hasRole(ADMIN_ROLE, msg.sender), "Unauthorized");
        require(amount > 0, "Amount must be > 0");
        
        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        bufferBalance += amount;
        emit BufferDeposit(amount, bufferBalance);
    }

    // ============ Withdraw from Buffer ============

    function withdraw(uint256 amount, address recipient) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        require(msg.sender == ailaVault, "Only vault can withdraw");
        require(amount > 0, "Amount must be > 0");
        require(amount <= bufferBalance, "Insufficient buffer");
        
        bufferBalance -= amount;
        
        bool success = usdc.transfer(recipient, amount);
        require(success, "Transfer failed");
        
        emit BufferWithdraw(amount, recipient, bufferBalance);
        
        // Check if buffer below minimum and request top-up
        if (bufferBalance < (totalVaultSize * minBufferPercent) / 100) {
            emit BufferTopUpRequested(amount);
        }
        
        return true;
    }

    // ============ Buffer Management ============

    function isBufferHealthy() external view returns (bool) {
        uint256 minRequired = (totalVaultSize * minBufferPercent) / 100;
        return bufferBalance >= minRequired;
    }

    function getBufferUtilization() external view returns (uint256) {
        if (totalVaultSize == 0) return 0;
        return (bufferBalance * 100) / totalVaultSize;
    }

    // ============ Admin Functions ============

    function setVaultReference(address _vault) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_vault != address(0), "Invalid vault");
        ailaVault = _vault;
    }

    function setYieldAllocatorReference(address _allocator) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_allocator != address(0), "Invalid allocator");
        yieldAllocator = _allocator;
    }

    function setBufferPercentages(uint256 _min, uint256 _max) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_min < _max, "Min must be < Max");
        require(_max <= 50, "Max too high");
        minBufferPercent = _min;
        maxBufferPercent = _max;
    }

    function syncVaultSize(uint256 newSize) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        totalVaultSize = newSize;
        emit VaultSizeUpdated(newSize);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
```

### Step 3.3: YieldAllocator.sol (Stub)

**File: `contracts/src/YieldAllocator.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title YieldAllocator
 * @notice Manages yield allocations (Phase 1: stub, Phase 2: real integration)
 */
contract YieldAllocator is AccessControl {
    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public ailaVault;
    address public liquidityBuffer;
    
    // Supported pools (Phase 2: Aave, Curve, etc.)
    address[] public allocatedPools;
    mapping(address => uint256) public poolAllocations; // In basis points (10000 = 100%)
    mapping(address => uint256) public poolDeposits; // USDC deposited per pool
    
    uint256 public totalAllocated;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ Events ============

    event YieldAllocated(address indexed pool, uint256 amount);
    event YieldHarvested(uint256 amount, address indexed destination);
    event PoolAdded(address indexed pool);
    event AllocationUpdated(address indexed pool, uint256 newAllocation);

    // ============ Constructor ============

    constructor(address _usdc, address _vault, address _buffer) {
        require(_usdc != address(0), "Invalid USDC");
        require(_vault != address(0), "Invalid vault");
        require(_buffer != address(0), "Invalid buffer");
        
        usdc = IERC20(_usdc);
        ailaVault = _vault;
        liquidityBuffer = _buffer;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ Allocation (Phase 1: Mock) ============

    /**
     * @notice Allocate USDC to yield pools
     * @dev Phase 1: Mock allocation; Phase 2: Real DeFi integration
     */
    function allocate(uint256 amount, address pool) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(amount > 0, "Amount must be > 0");
        require(pool != address(0), "Invalid pool");
        
        // Phase 1: Just track allocation (no actual deposit yet)
        poolDeposits[pool] += amount;
        totalAllocated += amount;
        
        emit YieldAllocated(pool, amount);
    }

    /**
     * @notice Harvest yield from pools
     * @dev For MVP: simulate yield (5% APY). Phase 2: real harvest
     */
    function harvestYield() 
        external 
        returns (uint256 yieldAmount) 
    {
        // Mock: Calculate yield on total allocated (5% APY ≈ 0.0137% per day)
        uint256 dailyYield = (totalAllocated * 137) / 1000000; // 0.0137%
        
        // Transfer mocked yield to vault
        // In Phase 2, this will be real yield from DeFi protocols
        
        emit YieldHarvested(dailyYield, ailaVault);
        return dailyYield;
    }

    /**
     * @notice Rebalance allocations
     * @dev Stub for Phase 2+
     */
    function rebalance(address[] calldata pools, uint256[] calldata percentages) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(pools.length == percentages.length, "Length mismatch");
        
        // Validate percentages sum to 100%
        uint256 total = 0;
        for (uint i = 0; i < percentages.length; i++) {
            total += percentages[i];
        }
        require(total == 10000, "Percentages must sum to 100%");
        
        // Update allocations
        for (uint i = 0; i < pools.length; i++) {
            poolAllocations[pools[i]] = percentages[i];
        }
    }

    // ============ Admin Functions ============

    function addPool(address pool) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(pool != address(0), "Invalid pool");
        allocatedPools.push(pool);
        emit PoolAdded(pool);
    }

    function getPoolCount() external view returns (uint256) {
        return allocatedPools.length;
    }

    function getPools() external view returns (address[] memory) {
        return allocatedPools;
    }
}
```

---

## PART 4: TESTING

### Step 4.1: AilaVault Tests

**File: `contracts/test/AilaVault.test.ts`**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { AilaVault, IERC20 } from "../typechain-types";

describe("AilaVault", () => {
  let vault: AilaVault;
  let usdc: IERC20;
  let owner: any, user1: any, user2: any;
  const USDC_ADDRESS = "0x..."; // Arc testnet USDC address

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy AilaVault
    const AilaVault = await ethers.getContractFactory("AilaVault");
    vault = await AilaVault.deploy(USDC_ADDRESS);
    await vault.deployed();
    
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  });

  describe("Deployment", () => {
    it("should deploy with correct USDC address", async () => {
      expect(await vault.usdc()).to.equal(USDC_ADDRESS);
    });

    it("should grant ADMIN_ROLE to owner", async () => {
      const adminRole = await vault.ADMIN_ROLE();
      expect(await vault.hasRole(adminRole, owner.address)).to.be.true;
    });
  });

  describe("Deposit", () => {
    it("should deposit USDC successfully", async () => {
      const amount = ethers.parseUnits("100", 6);
      
      // Approve
      await usdc.connect(user1).approve(vault.address, amount);
      
      // Deposit
      await expect(vault.connect(user1).deposit(amount))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, amount);
      
      // Check balance
      expect(await vault.userBalances(user1.address)).to.equal(amount);
    });

    it("should fail if amount is 0", async () => {
      await expect(
        vault.connect(user1).deposit(0)
      ).to.be.revertedWith("Deposit amount must be > 0");
    });

    it("should increase total deposited", async () => {
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(vault.address, amount);
      await vault.connect(user1).deposit(amount);
      
      expect(await vault.totalUSDCDeposited()).to.equal(amount);
    });
  });

  describe("Withdraw", () => {
    beforeEach(async () => {
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(vault.address, amount);
      await vault.connect(user1).deposit(amount);
    });

    it("should withdraw USDC successfully", async () => {
      const amount = ethers.parseUnits("50", 6);
      
      await expect(vault.connect(user1).withdraw(amount))
        .to.emit(vault, "Withdraw");
      
      expect(await vault.userBalances(user1.address)).to.equal(
        ethers.parseUnits("50", 6)
      );
    });

    it("should fail if balance insufficient", async () => {
      const amount = ethers.parseUnits("150", 6);
      
      await expect(
        vault.connect(user1).withdraw(amount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Yield Accumulation", () => {
    beforeEach(async () => {
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(vault.address, amount);
      await vault.connect(user1).deposit(amount);
      
      // Grant ALLOCATOR_ROLE
      const allocatorRole = await vault.ALLOCATOR_ROLE();
      await vault.grantRole(allocatorRole, owner.address);
    });

    it("should accumulate yield", async () => {
      const yieldAmount = ethers.parseUnits("5", 6); // $5 yield
      
      await expect(vault.accumulateYield(user1.address, yieldAmount))
        .to.emit(vault, "YieldAccrued");
      
      expect(await vault.userYield(user1.address)).to.equal(yieldAmount);
    });

    it("should reflect yield in getBalance", async () => {
      const yieldAmount = ethers.parseUnits("5", 6);
      await vault.accumulateYield(user1.address, yieldAmount);
      
      const balance = await vault.getBalance(user1.address);
      expect(balance).to.equal(ethers.parseUnits("105", 6));
    });
  });

  describe("Pause/Unpause", () => {
    it("should pause deposits", async () => {
      await vault.pause();
      
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(vault.address, amount);
      
      await expect(
        vault.connect(user1).deposit(amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should unpause operations", async () => {
      await vault.pause();
      await vault.unpause();
      
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(vault.address, amount);
      
      await expect(vault.connect(user1).deposit(amount)).to.not.be.reverted;
    });
  });
});
```

---

## PART 5: DEPLOYMENT SCRIPT

### Step 5.1: Deploy Script

**File: `contracts/scripts/deploy.ts`**

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying AilaBank Contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  // USDC address on Arc testnet
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x..."; // Get from env
  console.log(`USDC Address: ${USDC_ADDRESS}`);
  
  // ===== Deploy Contracts =====
  
  console.log("\n1️⃣  Deploying AilaVault...");
  const AilaVault = await ethers.getContractFactory("AilaVault");
  const vault = await AilaVault.deploy(USDC_ADDRESS);
  await vault.deployed();
  console.log(`✅ AilaVault deployed to: ${vault.address}`);
  
  console.log("\n2️⃣  Deploying LiquidityBuffer...");
  const LiquidityBuffer = await ethers.getContractFactory("LiquidityBuffer");
  const buffer = await LiquidityBuffer.deploy(USDC_ADDRESS, vault.address);
  await buffer.deployed();
  console.log(`✅ LiquidityBuffer deployed to: ${buffer.address}`);
  
  console.log("\n3️⃣  Deploying YieldAllocator...");
  const YieldAllocator = await ethers.getContractFactory("YieldAllocator");
  const allocator = await YieldAllocator.deploy(
    USDC_ADDRESS,
    vault.address,
    buffer.address
  );
  await allocator.deployed();
  console.log(`✅ YieldAllocator deployed to: ${allocator.address}`);
  
  // ===== Post-Deployment Setup =====
  
  console.log("\n⚙️  Setting up permissions...");
  
  // Grant ALLOCATOR_ROLE to YieldAllocator
  const allocatorRole = await vault.ALLOCATOR_ROLE();
  const tx1 = await vault.grantAllocatorRole(allocator.address);
  await tx1.wait();
  console.log(`✅ Granted ALLOCATOR_ROLE to YieldAllocator`);
  
  // Set YieldAllocator reference in buffer
  const tx2 = await buffer.setYieldAllocatorReference(allocator.address);
  await tx2.wait();
  console.log(`✅ Set YieldAllocator reference in LiquidityBuffer`);
  
  // ===== Export ABIs =====
  
  console.log("\n📦 Exporting ABIs...");
  
  const abiDir = path.join(__dirname, "../abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  const vaultArtifact = await ethers.getContractFactory("AilaVault");
  fs.writeFileSync(
    path.join(abiDir, "AilaVault.json"),
    JSON.stringify(vaultArtifact.interface.formatJson(), null, 2)
  );
  
  const bufferArtifact = await ethers.getContractFactory("LiquidityBuffer");
  fs.writeFileSync(
    path.join(abiDir, "LiquidityBuffer.json"),
    JSON.stringify(bufferArtifact.interface.formatJson(), null, 2)
  );
  
  const allocatorArtifact = await ethers.getContractFactory("YieldAllocator");
  fs.writeFileSync(
    path.join(abiDir, "YieldAllocator.json"),
    JSON.stringify(allocatorArtifact.interface.formatJson(), null, 2)
  );
  
  console.log(`✅ ABIs exported to ${abiDir}`);
  
  // ===== Save Deployment Info =====
  
  const deployment = {
    network: network.name,
    chainId: network.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      vault: {
        address: vault.address,
        abi: "abi/AilaVault.json"
      },
      buffer: {
        address: buffer.address,
        abi: "abi/LiquidityBuffer.json"
      },
      allocator: {
        address: allocator.address,
        abi: "abi/YieldAllocator.json"
      }
    }
  };
  
  const deploymentFile = path.join(
    __dirname,
    `../deployments/${network.name}-${Date.now()}.json`
  );
  
  fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  
  console.log(`\n✅ Deployment Info saved to: ${deploymentFile}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(50));
  console.log(`
  Vault Address:    ${vault.address}
  Buffer Address:   ${buffer.address}
  Allocator Address: ${allocator.address}
  
  Next steps:
  1. Copy contract addresses to frontend/src/constants.ts
  2. Start event listener: npm run indexer:start
  3. Deploy frontend: npm run frontend:build
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

This is **Part 1 of your complete implementation guide**. It covers:

✅ **Project structure setup**
✅ **Smart contract architecture** (AilaVault, LiquidityBuffer, YieldAllocator)
✅ **Testing framework** (Hardhat + Chai)
✅ **Deployment scripts**
✅ **ABI exports**

**Next Part (Part 2)** will cover:
- Event Listener implementation
- Frontend hooks & components
- Integration scripts
- Demo recording guide

**Should I create Part 2 now?** Just say the word! 🚀
