# 🧱 RAMSPHELD'S DETAILED TASK BREAKDOWN
## Complete Implementation Guide with Code Examples

**Last Updated**: October 30, 2025  
**Target**: AI Agents on Arc with USDC Hackathon (Submission: Nov 8)  
**Your Role**: Smart Contracts, Web3 Integration, Event Indexer, Frontend

---

## 📋 TASK OVERVIEW

| Phase | Tasks | Est. Time | Priority |
|-------|-------|-----------|----------|
| **Environment Setup** | 1 task | 2 hours | 🔴 Critical |
| **Smart Contracts** | 15 tasks | 3-4 days | 🔴 Critical |
| **Contract Testing** | 8 tasks | 2 days | 🔴 Critical |
| **Event Indexer** | 6 tasks | 1.5 days | 🟡 High |
| **Frontend Hooks** | 4 tasks | 1 day | 🟡 High |
| **Frontend Components** | 10 tasks | 2 days | 🟡 High |
| **Integration** | 5 tasks | 1 day | 🔴 Critical |
| **Testing & Security** | 6 tasks | 1.5 days | 🔴 Critical |
| **Documentation & Demo** | 5 tasks | 1 day | 🟡 High |

**Total Estimated Time**: 10-12 days

---

## 🔵 New Strategic Deliverables (Contracts/Web3)

1. RateSweep primitives
   - Configurable policy params on‑chain (buffer %, allowed pools, min APY)
   - Events for allocation/harvest with metadata to power receipts

2. Proof‑of‑Best‑Execution anchors
   - Emit `BestExecReceipt` event with `quoteId`, `route`, `feeBps`, `fxRate`, `spreadBps`
   - Map off‑chain receipt JSON to on‑chain keccak256 hash for auditability

3. Merchant toolkit contracts
   - Minimal `Invoice` and `Subscription` structs/events for on‑chain receipts
   - Refund events and idempotent references

4. Treasury telemetry
   - Buffer health metrics events; `BufferTopUpRequested` already present → expose in frontend
   - Read methods for policy state to render SME dashboards

5. Safety rails
   - De‑peg circuit breaker input (oracle stub now, Chainlink later)
   - Chain failover flag exposed to backend/indexer

Frontend/web3
- Add UI surfacing receipt hashes, allocation splits, and buffer health; expose helper formatters for Florence
  (Voice UX handled by Pedro; ensure hooks/components expose data needed by Pedro’s `VoiceInterface`.)

---

## 📋 Task Overview — Full Checklist

1) Contracts — Core (Days 1–3)
- AilaVault: finalize deposit/withdraw, yield tracking, roles, TVL, health
- LiquidityBuffer: min/max buffer %, withdraw to user, top-up events
- YieldAllocator: allocation/harvest stubs, unwind to buffer, pool registry

2) Contracts — Extensions (Days 3–4)
- BestExecReceipt anchoring (event or minimal contract): `quoteId`, `route`, `fxRate`, `feeBps`, `spreadBps`, `hash`
- Merchant receipts: `InvoiceCreated`, `InvoicePaid`, `RefundIssued`, `SubscriptionCreated`, `SubscriptionCharged`, `SubscriptionCancelled`
- Safety rails: de-peg circuit breaker input (oracle stub), chain failover flag

3) Contract Tests (Days 2–4)
- Unit tests: deposit/withdraw paths, yield accrual, buffer health, unwind
- Edge cases: circuit breaker, paused state, insufficient buffer, role checks
- Events: verify payload correctness (allocation/harvest/receipts)

4) Deployment & ABIs (Day 4)
- Hardhat config for Arc testnet; scripts for deploy + verify
- Export ABIs to `frontend/public/abis/` and `indexer/abi/`
- Record deployed addresses; update `frontend/src/constants.ts`

5) Indexer (Days 5–6)
- Listen to: Deposit, Withdraw, YieldAccrued, BufferWithdraw, BestExecReceipt, Invoice/Subscription events
- Webhooks to backend (`/deposit/ack`, `/withdraw/ack`, `/yield/ack`, `/receipts/ack`, `/merchant/ack`)
- Reconciler updates to include new contract stats and mismatch alerts

6) Frontend Hooks (Days 6–7)
- `useWallet`, `useVault`, `useLiquidityBuffer`, `useReceiptAnchor`, `useMerchantReceipts`
- Helpers to format USDC (6dp), APY, buffer utilization, route hashes

7) Frontend Components (Days 7–8)
- Receipt hash surfacing in `BestExecutionReceiptModal`
- Allocation split visualization (buffer vs yield) in `YieldStats`
- Merchant components: `InvoiceCreate`, `SubscriptionCreate`, `RefundModal`

8) E2E Flow Wiring (Day 8)
- Grace scenario on Arc testnet (deposit → allocate → withdraw)
- Sample best-exec anchoring and merchant invoice flow

9) Security & Tools (Day 9)
- Slither/MythX runs; address HIGH/MEDIUM findings
- Reentrancy checks verified; input validation sanity

## 🎯 PHASE 1: ENVIRONMENT SETUP

### Task 1.1: Install Dependencies

**Objective**: Set up development environment for Solidity, TypeScript, and React.

**Steps**:

```bash
# Check Node.js version (need 18+)
node --version

# If not 18+, install via nvm:
nvm install 18
nvm use 18

# Create project structure
cd /home/ramspheld/Projects/Ramspheld/aila
mkdir -p contracts backend frontend indexer docs

# Install global tools
npm install -g hardhat pnpm typescript ts-node

# Initialize contracts workspace
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts ethers dotenv

# Initialize Hardhat
npx hardhat init
# Select: "Create a TypeScript project"

# Install testing dependencies
npm install --save-dev @nomicfoundation/hardhat-chai-matchers chai @types/chai

# Install security tools
npm install --save-dev @nomicfoundation/hardhat-verify
pip3 install slither-analyzer mythx-cli
```

**Expected Output**:
- `contracts/` folder with Hardhat config
- `node_modules/` populated
- `hardhat.config.ts` file created

---

### Task 1.2: Configure Arc Testnet

**Objective**: Connect Hardhat to Arc testnet and get test USDC.

**File**: `contracts/.env`

```bash
# Private key (NEVER commit this!)
PRIVATE_KEY=your_metamask_private_key_here

# Arc Testnet Configuration
ARC_RPC_URL=https://testnet.arc.network/rpc
ARC_CHAIN_ID=12345  # Replace with actual Arc testnet chain ID
ARC_EXPLORER_API_KEY=your_explorer_key

# Circle API (for fiat integration - Pedro will handle)
CIRCLE_API_KEY=your_circle_api_key

# USDC Contract on Arc Testnet
USDC_ADDRESS=0x...  # Get from Arc docs or faucet page
```

**File**: `contracts/hardhat.config.ts`

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    arcTestnet: {
      url: process.env.ARC_RPC_URL || "",
      chainId: parseInt(process.env.ARC_CHAIN_ID || "12345"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 8000000000,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: parseInt(process.env.ARC_CHAIN_ID || "12345"),
        urls: {
          apiURL: "https://testnet-explorer.arc.network/api",
          browserURL: "https://testnet-explorer.arc.network",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
```

**Get Testnet USDC**:

1. Go to [Arc Testnet Faucet](https://faucet.arc.network)
2. Connect MetaMask with your deployer address
3. Request testnet ETH (for gas)
4. Request testnet USDC (for testing deposits)
5. Verify in MetaMask: Add USDC token using contract address

**Verification**:

```bash
cd contracts
npx hardhat compile
# Should compile successfully

npx hardhat console --network arcTestnet
# Should connect without errors
```

---

## 🎯 PHASE 2: SMART CONTRACT DEVELOPMENT

### Task 2.1: AilaVault.sol - Core Structure

**Objective**: Create the main vault contract that holds user balances and tracks yield.

**File**: `contracts/contracts/AilaVault.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
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
    event YieldAccrued(address indexed user, uint256 amount, uint256 totalYield);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event LiquidityBufferSet(address indexed buffer);
    event YieldAllocatorSet(address indexed allocator);
    event MaxWithdrawalPercentUpdated(uint256 newPercent);

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

    // ========== CORE FUNCTIONS (Next tasks) ==========
    
    // Task 2.2: deposit() function
    // Task 2.3: withdraw() function
    // Task 2.4: accumulateYield() function
    // Task 2.5: Admin functions
}
```

**Key Design Decisions**:

1. **AccessControl**: Multi-role system for security
   - `ADMIN_ROLE`: Can pause, set addresses, adjust parameters
   - `YIELD_MANAGER_ROLE`: Can call `accumulateYield()` (will be YieldAllocator)

2. **Pausable**: Emergency stop mechanism

3. **ReentrancyGuard**: Prevents reentrancy attacks on withdrawals

4. **Immutable USDC**: Gas optimization, can't be changed after deployment

5. **Separate yield tracking**: Allows transparent accounting

**Compile & Verify**:

```bash
cd contracts
npx hardhat compile
# Should compile with 0 errors
```

---

### Task 2.2: AilaVault - Deposit Function

**Objective**: Implement safe USDC deposits with event emission.

**Add to** `contracts/contracts/AilaVault.sol`:

```solidity
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
```

**Testing Checklist**:
- ✅ Deposit with 0 amount should revert
- ✅ Deposit without approval should revert
- ✅ Successful deposit updates userBalances
- ✅ Successful deposit updates totalUSDCDeposited
- ✅ Deposit event is emitted with correct params
- ✅ Multiple deposits from same user accumulate
- ✅ Deposits from different users are isolated

**Example Test** (Task 2.6):

```typescript
// contracts/test/AilaVault.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { AilaVault, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AilaVault - Deposit", function () {
  let vault: AilaVault;
  let usdc: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Deploy vault
    const AilaVault = await ethers.getContractFactory("AilaVault");
    vault = await AilaVault.deploy(await usdc.getAddress(), owner.address);

    // Mint USDC to user1
    await usdc.mint(user1.address, ethers.parseUnits("1000", 6));
  });

  it("Should deposit USDC successfully", async function () {
    const amount = ethers.parseUnits("100", 6);

    // Approve vault
    await usdc.connect(user1).approve(await vault.getAddress(), amount);

    // Deposit
    await expect(vault.connect(user1).deposit(amount))
      .to.emit(vault, "Deposit")
      .withArgs(user1.address, amount, anyValue);

    // Check balance
    expect(await vault.getBalance(user1.address)).to.equal(amount);
    expect(await vault.totalUSDCDeposited()).to.equal(amount);
  });

  it("Should revert on zero deposit", async function () {
    await expect(vault.connect(user1).deposit(0))
      .to.be.revertedWithCustomError(vault, "InvalidAmount");
  });

  it("Should revert without approval", async function () {
    await expect(vault.connect(user1).deposit(ethers.parseUnits("100", 6)))
      .to.be.reverted;
  });
});
```

---

### Task 2.3: AilaVault - Withdrawal Function

**Objective**: Implement withdrawal with buffer integration and circuit breaker.

**Add to** `contracts/contracts/AilaVault.sol`:

```solidity
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
                abi.encodeWithSignature("withdraw(uint256,address)", amount, msg.sender)
            );
            
            if (success) {
                emit Withdraw(msg.sender, amount, msg.sender, block.timestamp);
                return;
            }
            // If buffer doesn't have liquidity, fall through to direct transfer
        }

        // Direct transfer from vault (fallback if buffer not set or insufficient)
        usdc.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, msg.sender, block.timestamp);
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

        emit Withdraw(user, amount, user, block.timestamp);
    }
```

**Key Safety Features**:

1. **Reentrancy Protection**: `nonReentrant` modifier
2. **Circuit Breaker**: Limits single withdrawal to 10% of TVL
3. **Yield Priority**: Deducts from yield before touching principal
4. **Buffer Integration**: Tries buffer first (instant), falls back to direct transfer
5. **Emergency Escape**: Admin can bypass limits if needed

**Testing Checklist**:
- ✅ Withdraw with 0 amount reverts
- ✅ Withdraw more than balance reverts
- ✅ Withdraw >10% TVL reverts (circuit breaker)
- ✅ Withdraw deducts from yield first
- ✅ Withdraw updates totalUSDCDeposited
- ✅ Withdraw event emitted
- ✅ Emergency withdraw bypasses circuit breaker

---

### Task 2.4: AilaVault - Yield Tracking

**Objective**: Allow YieldAllocator to credit yield to users.

**Add to** `contracts/contracts/AilaVault.sol`:

```solidity
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
```

**Key Points**:
- Only accounts with `YIELD_MANAGER_ROLE` can credit yield (will be YieldAllocator)
- Batch function for gas efficiency when distributing yield to many users
- APY calculation for frontend display

---

### Task 2.5: AilaVault - Admin Functions

**Objective**: Add administrative controls for pausing, upgrades, and configuration.

**Add to** `contracts/contracts/AilaVault.sol`:

```solidity
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
```

**Complete! AilaVault.sol is now fully implemented.**

---

### Task 2.6-2.8: LiquidityBuffer.sol (Full Implementation)

**File**: `contracts/contracts/LiquidityBuffer.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAilaVault {
    function getTVL() external view returns (uint256);
}

interface IYieldAllocator {
    function unwindToBuffer(uint256 needed) external;
}

/**
 * @title LiquidityBuffer
 * @notice Holds reserve USDC (10-20% of vault) for instant withdrawals
 * @dev Auto-triggers refill from YieldAllocator when below threshold
 */
contract LiquidityBuffer is AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ========== STATE VARIABLES ==========

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    IERC20 public immutable usdc;
    IAilaVault public immutable ailaVault;
    IYieldAllocator public yieldAllocator;

    /// @notice Current buffer balance
    uint256 public bufferBalance;

    /// @notice Target buffer percentage of TVL (default 20%)
    uint256 public maxBufferPercent = 20;

    /// @notice Minimum buffer percentage before refill (default 10%)
    uint256 public minBufferPercent = 10;

    // ========== EVENTS ==========

    event BufferDeposit(uint256 amount, uint256 newBalance);
    event BufferWithdraw(uint256 amount, address recipient, uint256 newBalance);
    event BufferTopUpRequested(uint256 needed);
    event YieldAllocatorSet(address indexed allocator);
    event BufferThresholdsUpdated(uint256 minPercent, uint256 maxPercent);

    // ========== ERRORS ==========

    error InsufficientBuffer();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidPercent();

    // ========== CONSTRUCTOR ==========

    constructor(address _usdc, address _vault, address _admin) {
        if (_usdc == address(0) || _vault == address(0) || _admin == address(0)) 
            revert InvalidAddress();

        usdc = IERC20(_usdc);
        ailaVault = IAilaVault(_vault);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _vault);
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * @notice Deposit USDC into buffer
     * @param amount Amount to deposit
     * @dev Only callable by vault or admin
     */
    function deposit(uint256 amount) external onlyRole(VAULT_ROLE) whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        bufferBalance += amount;

        emit BufferDeposit(amount, bufferBalance);
    }

    /**
     * @notice Withdraw USDC from buffer for user
     * @param amount Amount to withdraw
     * @param recipient Address to send USDC to
     * @dev Only callable by vault
     */
    function withdraw(uint256 amount, address recipient) 
        external 
        onlyRole(VAULT_ROLE) 
        whenNotPaused 
        returns (bool success)
    {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAddress();

        // Check if buffer has enough
        if (amount > bufferBalance) {
            // Try to trigger refill
            if (address(yieldAllocator) != address(0)) {
                try yieldAllocator.unwindToBuffer(amount - bufferBalance) {
                    // Wait for refill, then check again
                    if (amount > bufferBalance) {
                        return false; // Still insufficient
                    }
                } catch {
                    return false; // Unwind failed
                }
            } else {
                return false; // No allocator set
            }
        }

        bufferBalance -= amount;
        usdc.safeTransfer(recipient, amount);

        emit BufferWithdraw(amount, recipient, bufferBalance);

        // Check if buffer needs refill
        _checkBufferHealth();

        return true;
    }

    /**
     * @notice Check buffer health and request top-up if needed
     */
    function _checkBufferHealth() internal {
        uint256 tvl = ailaVault.getTVL();
        uint256 minBuffer = (tvl * minBufferPercent) / 100;

        if (bufferBalance < minBuffer && address(yieldAllocator) != address(0)) {
            uint256 needed = minBuffer - bufferBalance;
            emit BufferTopUpRequested(needed);
            
            try yieldAllocator.unwindToBuffer(needed) {
                // Top-up initiated
            } catch {
                // Silently fail, will retry on next withdrawal
            }
        }
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Check if buffer is healthy (above minimum threshold)
     * @return healthy True if buffer >= minBufferPercent of TVL
     */
    function isBufferHealthy() external view returns (bool healthy) {
        uint256 tvl = ailaVault.getTVL();
        if (tvl == 0) return true;

        uint256 minBuffer = (tvl * minBufferPercent) / 100;
        return bufferBalance >= minBuffer;
    }

    /**
     * @notice Get current buffer utilization as percentage
     * @return percent Buffer balance as % of TVL
     */
    function getBufferUtilization() external view returns (uint256 percent) {
        uint256 tvl = ailaVault.getTVL();
        if (tvl == 0) return 0;

        return (bufferBalance * 100) / tvl;
    }

    /**
     * @notice Get buffer capacity (how much can be withdrawn instantly)
     * @return capacity Available USDC in buffer
     */
    function getAvailableCapacity() external view returns (uint256 capacity) {
        return bufferBalance;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set YieldAllocator contract
     * @param _allocator Address of YieldAllocator
     */
    function setYieldAllocator(address _allocator) external onlyRole(ADMIN_ROLE) {
        if (_allocator == address(0)) revert InvalidAddress();
        yieldAllocator = IYieldAllocator(_allocator);
        emit YieldAllocatorSet(_allocator);
    }

    /**
     * @notice Update buffer thresholds
     * @param _minPercent Minimum buffer percentage
     * @param _maxPercent Maximum buffer percentage
     */
    function setBufferThresholds(uint256 _minPercent, uint256 _maxPercent) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_minPercent == 0 || _minPercent >= _maxPercent || _maxPercent > 100) 
            revert InvalidPercent();

        minBufferPercent = _minPercent;
        maxBufferPercent = _maxPercent;

        emit BufferThresholdsUpdated(_minPercent, _maxPercent);
    }

    /**
     * @notice Pause buffer operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause buffer
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
```

---

### Task 2.9-2.11: YieldAllocator.sol (Full Implementation)

**File**: `contracts/contracts/YieldAllocator.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAilaVault {
    function accumulateYield(address user, uint256 yieldAmount) external;
    function batchAccumulateYield(address[] calldata users, uint256[] calldata amounts) external;
}

interface ILiquidityBuffer {
    function deposit(uint256 amount) external;
}

/**
 * @title YieldAllocator
 * @notice Manages yield allocations to DeFi pools and RWA products
 * @dev MVP version with mock yield; will integrate real protocols in production
 */
contract YieldAllocator is AccessControl {
    using SafeERC20 for IERC20;

    // ========== STATE VARIABLES ==========

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");

    IERC20 public immutable usdc;
    IAilaVault public immutable ailaVault;
    ILiquidityBuffer public liquidityBuffer;

    struct YieldPool {
        address poolAddress;
        uint256 allocation;      // Amount allocated
        uint256 targetAPY;       // Target APY in basis points (e.g., 500 = 5%)
        uint256 lastHarvest;     // Timestamp of last yield harvest
        bool isActive;
    }

    /// @notice List of yield pools
    address[] public poolAddresses;
    
    /// @notice Pool details
    mapping(address => YieldPool) public pools;

    /// @notice Total USDC allocated to yield
    uint256 public totalAllocated;

    /// @notice Mock yield rate for MVP (5% APY = 500 basis points)
    uint256 public mockYieldRate = 500;

    // ========== EVENTS ==========

    event YieldAllocated(address indexed pool, uint256 amount);
    event YieldHarvested(uint256 amount, address indexed destination);
    event Rebalanced(address[] pools, uint256[] newAllocations);
    event PoolAdded(address indexed pool, uint256 targetAPY);
    event PoolRemoved(address indexed pool);
    event UnwindToBuffer(uint256 amount);

    // ========== ERRORS ==========

    error PoolNotActive();
    error InvalidAmount();
    error InvalidAddress();
    error ArrayLengthMismatch();

    // ========== CONSTRUCTOR ==========

    constructor(address _usdc, address _vault, address _admin) {
        if (_usdc == address(0) || _vault == address(0) || _admin == address(0))
            revert InvalidAddress();

        usdc = IERC20(_usdc);
        ailaVault = IAilaVault(_vault);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(AI_AGENT_ROLE, _admin); // Grant to admin for MVP
    }

    // ========== ALLOCATION FUNCTIONS ==========

    /**
     * @notice Allocate USDC to a yield pool
     * @param amount Amount to allocate
     * @param pool Pool address
     * @dev MVP: Simulates allocation without actual protocol integration
     */
    function allocate(uint256 amount, address pool) 
        external 
        onlyRole(AI_AGENT_ROLE) 
    {
        if (amount == 0) revert InvalidAmount();
        if (!pools[pool].isActive) revert PoolNotActive();

        // Transfer USDC from vault to allocator
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update allocation (MVP: just track, don't actually deploy)
        pools[pool].allocation += amount;
        totalAllocated += amount;

        emit YieldAllocated(pool, amount);
    }

    /**
     * @notice Rebalance allocations across pools
     * @param poolList List of pool addresses
     * @param newAllocations New allocation amounts (must match poolList)
     */
    function rebalance(address[] calldata poolList, uint256[] calldata newAllocations)
        external
        onlyRole(AI_AGENT_ROLE)
    {
        if (poolList.length != newAllocations.length) revert ArrayLengthMismatch();

        uint256 newTotal = 0;

        for (uint256 i = 0; i < poolList.length; i++) {
            address pool = poolList[i];
            if (!pools[pool].isActive) revert PoolNotActive();

            pools[pool].allocation = newAllocations[i];
            newTotal += newAllocations[i];
        }

        totalAllocated = newTotal;

        emit Rebalanced(poolList, newAllocations);
    }

    // ========== YIELD FUNCTIONS ==========

    /**
     * @notice Harvest yield from all pools and distribute to vault
     * @dev MVP: Calculates mock yield based on time elapsed
     */
    function harvestYield() external {
        uint256 totalYield = 0;

        for (uint256 i = 0; i < poolAddresses.length; i++) {
            address poolAddr = poolAddresses[i];
            YieldPool storage pool = pools[poolAddr];

            if (!pool.isActive || pool.allocation == 0) continue;

            // Calculate mock yield: (allocation * APY * time) / (365 days * 10000)
            uint256 timeElapsed = block.timestamp - pool.lastHarvest;
            uint256 yield = (pool.allocation * pool.targetAPY * timeElapsed) / 
                           (365 days * 10000);

            totalYield += yield;
            pool.lastHarvest = block.timestamp;
        }

        if (totalYield > 0) {
            // In production: would claim from actual protocols
            // MVP: assume yield magically appears (for demo purposes)
            
            emit YieldHarvested(totalYield, address(ailaVault));
        }
    }

    /**
     * @notice Get estimated APY for a pool
     * @param pool Pool address
     * @return APY in basis points
     */
    function getPoolYield(address pool) external view returns (uint256) {
        return pools[pool].targetAPY;
    }

    // ========== BUFFER MANAGEMENT ==========

    /**
     * @notice Unwind yield positions to refill buffer
     * @param needed Amount needed in buffer
     * @dev Selects pool with most liquidity and unwinds
     */
    function unwindToBuffer(uint256 needed) external {
        if (address(liquidityBuffer) == address(0)) revert InvalidAddress();
        if (needed == 0) revert InvalidAmount();

        // Find pool with highest allocation
        address bestPool;
        uint256 maxAllocation = 0;

        for (uint256 i = 0; i < poolAddresses.length; i++) {
            address poolAddr = poolAddresses[i];
            if (pools[poolAddr].isActive && pools[poolAddr].allocation > maxAllocation) {
                maxAllocation = pools[poolAddr].allocation;
                bestPool = poolAddr;
            }
        }

        require(maxAllocation >= needed, "Insufficient liquidity");

        // Unwind from best pool
        pools[bestPool].allocation -= needed;
        totalAllocated -= needed;

        // Transfer to buffer
        usdc.safeTransfer(address(liquidityBuffer), needed);
        liquidityBuffer.deposit(needed);

        emit UnwindToBuffer(needed);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Add a new yield pool
     * @param pool Pool address
     * @param targetAPY Target APY in basis points
     */
    function addPool(address pool, uint256 targetAPY) external onlyRole(ADMIN_ROLE) {
        if (pool == address(0)) revert InvalidAddress();
        
        if (!pools[pool].isActive) {
            poolAddresses.push(pool);
        }

        pools[pool] = YieldPool({
            poolAddress: pool,
            allocation: 0,
            targetAPY: targetAPY,
            lastHarvest: block.timestamp,
            isActive: true
        });

        emit PoolAdded(pool, targetAPY);
    }

    /**
     * @notice Set liquidity buffer
     * @param _buffer Buffer contract address
     */
    function setLiquidityBuffer(address _buffer) external onlyRole(ADMIN_ROLE) {
        if (_buffer == address(0)) revert InvalidAddress();
        liquidityBuffer = ILiquidityBuffer(_buffer);
    }

    /**
     * @notice Get all active pools
     * @return List of pool addresses
     */
    function getActivePools() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < poolAddresses.length; i++) {
            if (pools[poolAddresses[i]].isActive) {
                activeCount++;
            }
        }

        address[] memory activePools = new address[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < poolAddresses.length; i++) {
            if (pools[poolAddresses[i]].isActive) {
                activePools[index] = poolAddresses[i];
                index++;
            }
        }

        return activePools;
    }
}
```

---

## ✅ CONTRACTS COMPLETE!

You now have:
- ✅ **AilaVault.sol**: Core deposit/withdrawal/yield tracking
- ✅ **LiquidityBuffer.sol**: Instant withdrawal buffer
- ✅ **YieldAllocator.sol**: Yield management (mock for MVP)

**Next Steps**:
1. Compile contracts: `npx hardhat compile`
2. Write tests (Tasks 2.12-2.14)
3. Deploy to Arc testnet (Tasks 2.15-2.17)

---

## 🎯 CONTINUE TO NEXT PHASE?

Should I now provide:
1. **Complete test suite** for all contracts?
2. **Deployment scripts** for Arc testnet?
3. **Event indexer implementation**?
4. **Frontend hooks and components**?

Let me know which section you want next!
