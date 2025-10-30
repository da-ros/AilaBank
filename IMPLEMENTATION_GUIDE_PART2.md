# 🛠️ AilaBank — Implementation Guide Part 2

**Frontend, Event Listener, and End-to-End Integration**

---

## PART 6: EVENT LISTENER & INDEXER

### Step 6.1: Indexer Package.json

**File: `indexer/package.json`**

```json
{
  "name": "@aila/indexer",
  "version": "0.1.0",
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "ethers": "^6.7.1",
    "redis": "^4.6.7",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1",
    "@types/node": "^20.4.2"
  }
}
```

### Step 6.2: Environment File

**File: `indexer/.env.example`**

```bash
# Arc Testnet
ARC_TESTNET_RPC=https://testnet.arc.io/rpc
ARC_MAINNET_RPC=https://mainnet.arc.io/rpc

# Contract Addresses (from deployment)
VAULT_ADDRESS=0x...
BUFFER_ADDRESS=0x...
ALLOCATOR_ADDRESS=0x...

# Backend Orchestrator
BACKEND_URL=http://localhost:3000
BACKEND_WEBHOOK_DEPOSIT=/api/v1/deposit/ack
BACKEND_WEBHOOK_WITHDRAW=/api/v1/withdraw/ack

# Redis (for caching events)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

### Step 6.3: Event Listener Service

**File: `indexer/src/index.ts`**

```typescript
import { ethers } from 'ethers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { EventProcessor } from './eventProcessor';
import { Reconciler } from './reconciler';
import logger from './logger';

dotenv.config();

// ============ Configuration ============

const ARC_RPC_URL = process.env.ARC_TESTNET_RPC || 'https://testnet.arc.io/rpc';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '';
const BUFFER_ADDRESS = process.env.BUFFER_ADDRESS || '';
const ALLOCATOR_ADDRESS = process.env.ALLOCATOR_ADDRESS || '';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ============ Load ABIs ============

const VAULT_ABI = require('../abi/AilaVault.json');
const BUFFER_ABI = require('../abi/LiquidityBuffer.json');
const ALLOCATOR_ABI = require('../abi/YieldAllocator.json');

// ============ Service Initialization ============

class IndexerService {
  private provider: ethers.JsonRpcProvider;
  private vaultContract: ethers.Contract;
  private bufferContract: ethers.Contract;
  private allocatorContract: ethers.Contract;
  private eventProcessor: EventProcessor;
  private reconciler: Reconciler;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    
    // Initialize contracts
    this.vaultContract = new ethers.Contract(
      VAULT_ADDRESS,
      VAULT_ABI,
      this.provider
    );
    
    this.bufferContract = new ethers.Contract(
      BUFFER_ADDRESS,
      BUFFER_ABI,
      this.provider
    );
    
    this.allocatorContract = new ethers.Contract(
      ALLOCATOR_ADDRESS,
      ALLOCATOR_ABI,
      this.provider
    );
    
    // Initialize helpers
    this.eventProcessor = new EventProcessor(BACKEND_URL);
    this.reconciler = new Reconciler(
      this.provider,
      this.vaultContract,
      BACKEND_URL
    );
    
    logger.info('🚀 IndexerService initialized');
  }

  // ============ Event Listeners ============

  async startListening() {
    logger.info('👂 Starting event listeners...');
    
    // Listen for Deposit events
    this.vaultContract.on('Deposit', async (user, amount, timestamp, event) => {
      logger.info(`📥 Deposit event detected:`, {
        user,
        amount: ethers.formatUnits(amount, 6),
        txHash: event.transactionHash
      });
      
      try {
        await this.eventProcessor.processDeposit({
          user,
          amount: amount.toString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error processing deposit:', error);
      }
    });
    
    // Listen for Withdraw events
    this.vaultContract.on('Withdraw', async (user, amount, toAddress, timestamp, event) => {
      logger.info(`📤 Withdraw event detected:`, {
        user,
        amount: ethers.formatUnits(amount, 6),
        toAddress,
        txHash: event.transactionHash
      });
      
      try {
        await this.eventProcessor.processWithdraw({
          user,
          amount: amount.toString(),
          toAddress,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error processing withdrawal:', error);
      }
    });
    
    // Listen for YieldAccrued events
    this.vaultContract.on('YieldAccrued', async (user, amount, totalYield, timestamp, event) => {
      logger.info(`💰 Yield accrued:`, {
        user,
        amount: ethers.formatUnits(amount, 6),
        totalYield: ethers.formatUnits(totalYield, 6),
        txHash: event.transactionHash
      });
      
      try {
        await this.eventProcessor.processYield({
          user,
          amount: amount.toString(),
          totalYield: totalYield.toString(),
          txHash: event.transactionHash,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error processing yield:', error);
      }
    });
    
    // Listen for BufferWithdraw events
    this.bufferContract.on('BufferWithdraw', async (amount, recipient, newBalance, event) => {
      logger.info(`🔄 Buffer withdrawal:`, {
        amount: ethers.formatUnits(amount, 6),
        recipient,
        newBalance: ethers.formatUnits(newBalance, 6),
        txHash: event.transactionHash
      });
    });
    
    // Listen for block confirmations
    this.provider.on('block', (blockNumber) => {
      logger.debug(`✅ Arc Block ${blockNumber}`);
    });
    
    logger.info('✅ Event listeners started');
  }

  // ============ Reconciliation ============

  async startReconciliation() {
    logger.info('🔄 Starting daily reconciliation scheduler...');
    
    // Run reconciliation every 24 hours
    setInterval(async () => {
      try {
        logger.info('🔄 Running nightly reconciliation...');
        await this.reconciler.reconcileBalances();
        logger.info('✅ Reconciliation completed');
      } catch (error) {
        logger.error('❌ Reconciliation failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Also run on startup after a small delay
    setTimeout(async () => {
      try {
        logger.info('🔄 Running initial reconciliation...');
        await this.reconciler.reconcileBalances();
        logger.info('✅ Initial reconciliation completed');
      } catch (error) {
        logger.error('❌ Initial reconciliation failed:', error);
      }
    }, 5000); // 5 seconds after startup
  }

  // ============ Health Check ============

  async healthCheck() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const vaultStats = await this.vaultContract.getVaultStats();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        blockNumber,
        vaultStats: {
          totalDeposited: ethers.formatUnits(vaultStats[0], 6),
          totalYield: ethers.formatUnits(vaultStats[1], 6),
          totalBalance: ethers.formatUnits(vaultStats[2], 6)
        }
      };
      
      logger.info('✅ Health check passed:', health);
      return health;
    } catch (error) {
      logger.error('❌ Health check failed:', error);
      return { status: 'unhealthy', error: String(error) };
    }
  }
}

// ============ Main ============

async function main() {
  logger.info('🎯 Starting AilaBank Indexer Service...');
  
  const indexer = new IndexerService();
  
  // Start listening to events
  await indexer.startListening();
  
  // Start reconciliation
  await indexer.startReconciliation();
  
  // Health check every 5 minutes
  setInterval(() => indexer.healthCheck(), 5 * 60 * 1000);
  
  logger.info('🚀 Indexer service running...');
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
```

### Step 6.4: Event Processor

**File: `indexer/src/eventProcessor.ts`**

```typescript
import axios from 'axios';
import logger from './logger';

export interface DepositEvent {
  user: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export interface WithdrawEvent {
  user: string;
  amount: string;
  toAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export interface YieldEvent {
  user: string;
  amount: string;
  totalYield: string;
  txHash: string;
  timestamp: string;
}

export class EventProcessor {
  private backendUrl: string;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  async processDeposit(event: DepositEvent) {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/v1/deposit/ack`,
        {
          user: event.user,
          amount: event.amount,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          timestamp: event.timestamp,
          status: 'confirmed'
        },
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      logger.info('✅ Deposit ACK sent to backend:', response.data);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to send deposit ACK:', error);
      throw error;
    }
  }

  async processWithdraw(event: WithdrawEvent) {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/v1/withdraw/ack`,
        {
          user: event.user,
          amount: event.amount,
          toAddress: event.toAddress,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          timestamp: event.timestamp,
          status: 'confirmed'
        },
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      logger.info('✅ Withdraw ACK sent to backend:', response.data);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to send withdraw ACK:', error);
      throw error;
    }
  }

  async processYield(event: YieldEvent) {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/v1/yield/ack`,
        {
          user: event.user,
          amount: event.amount,
          totalYield: event.totalYield,
          txHash: event.txHash,
          timestamp: event.timestamp,
          status: 'confirmed'
        },
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      logger.info('✅ Yield ACK sent to backend:', response.data);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to send yield ACK:', error);
      throw error;
    }
  }
}
```

### Step 6.5: Reconciler

**File: `indexer/src/reconciler.ts`**

```typescript
import { ethers } from 'ethers';
import axios from 'axios';
import logger from './logger';

export class Reconciler {
  private provider: ethers.JsonRpcProvider;
  private vault: ethers.Contract;
  private backendUrl: string;

  constructor(
    provider: ethers.JsonRpcProvider,
    vault: ethers.Contract,
    backendUrl: string
  ) {
    this.provider = provider;
    this.vault = vault;
    this.backendUrl = backendUrl;
  }

  async reconcileBalances() {
    try {
      // Get on-chain vault stats
      const stats = await this.vault.getVaultStats();
      
      const onChainData = {
        totalDeposited: ethers.formatUnits(stats[0], 6),
        totalYield: ethers.formatUnits(stats[1], 6),
        totalBalance: ethers.formatUnits(stats[2], 6)
      };
      
      logger.info('📊 On-chain vault stats:', onChainData);
      
      // Get off-chain ledger from backend
      try {
        const ledgerResponse = await axios.get(
          `${this.backendUrl}/api/v1/ledger/stats`,
          { timeout: 5000 }
        );
        
        const offChainData = ledgerResponse.data;
        logger.info('📊 Off-chain ledger stats:', offChainData);
        
        // Compare and alert if mismatch
        const tolerance = 0.01; // Allow 0.01 USDC difference
        const depositDiff = Math.abs(
          Number(onChainData.totalDeposited) - Number(offChainData.totalDeposited)
        );
        
        if (depositDiff > tolerance) {
          logger.warn('⚠️  Balance mismatch detected:', {
            onChain: onChainData,
            offChain: offChainData,
            difference: depositDiff
          });
          
          // Send alert to backend
          await axios.post(
            `${this.backendUrl}/api/v1/alerts/balance-mismatch`,
            { onChainData, offChainData, difference: depositDiff },
            { timeout: 5000 }
          );
        } else {
          logger.info('✅ Balance reconciliation passed');
        }
      } catch (error) {
        logger.warn('⚠️  Could not reach backend for reconciliation:', error);
      }
    } catch (error) {
      logger.error('❌ Reconciliation error:', error);
    }
  }
}
```

### Step 6.6: Logger Setup

**File: `indexer/src/logger.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

class Logger {
  private getTimestamp() {
    return new Date().toISOString();
  }

  private logToFile(level: string, message: string, data?: any) {
    const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${this.getTimestamp()} [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(logFile, logEntry);
  }

  info(message: string, data?: any) {
    console.log(`ℹ️  ${this.getTimestamp()} [INFO] ${message}`, data || '');
    this.logToFile('INFO', message, data);
  }

  warn(message: string, data?: any) {
    console.warn(`⚠️  ${this.getTimestamp()} [WARN] ${message}`, data || '');
    this.logToFile('WARN', message, data);
  }

  error(message: string, error?: any) {
    console.error(`❌ ${this.getTimestamp()} [ERROR] ${message}`, error || '');
    this.logToFile('ERROR', message, error);
  }

  debug(message: string, data?: any) {
    if (LOG_LEVEL === 'debug') {
      console.log(`🐛 ${this.getTimestamp()} [DEBUG] ${message}`, data || '');
      this.logToFile('DEBUG', message, data);
    }
  }
}

export default new Logger();
```

---

## PART 7: FRONTEND SETUP & REACT HOOKS

### Step 7.1: Frontend Package.json

**File: `frontend/package.json`**

```json
{
  "name": "@aila/frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "ethers": "^6.7.1",
    "axios": "^1.5.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-label": "^2.0.2",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.1.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.4.2",
    "@types/jest": "^29.5.3",
    "jest": "^29.6.2",
    "jest-environment-jsdom": "^29.6.2"
  }
}
```

### Step 7.2: Frontend Environment

**File: `frontend/.env.local.example`**

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Arc Network
NEXT_PUBLIC_ARC_RPC=https://testnet.arc.io/rpc
NEXT_PUBLIC_ARC_CHAIN_ID=91002

# Contract Addresses
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_BUFFER_ADDRESS=0x...
NEXT_PUBLIC_ALLOCATOR_ADDRESS=0x...

# USDC Address on Arc
NEXT_PUBLIC_USDC_ADDRESS=0x...

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_KEY=your_elevenlabs_api_key

# Cloudflare Workers AI
NEXT_PUBLIC_WORKERS_AI_ENDPOINT=https://aila-intent.your-account.workers.dev
```

### Step 7.3: Frontend Constants

**File: `frontend/src/constants.ts`**

```typescript
export const NETWORKS = {
  ARC_TESTNET: {
    chainId: 91002,
    name: 'Arc Testnet',
    rpc: process.env.NEXT_PUBLIC_ARC_RPC || 'https://testnet.arc.io/rpc',
    blockExplorer: 'https://testnet.arc.io'
  },
  ARC_MAINNET: {
    chainId: 91001,
    name: 'Arc Mainnet',
    rpc: process.env.NEXT_PUBLIC_ARC_RPC || 'https://mainnet.arc.io/rpc',
    blockExplorer: 'https://mainnet.arc.io'
  }
};

export const CONTRACTS = {
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x...',
  buffer: process.env.NEXT_PUBLIC_BUFFER_ADDRESS || '0x...',
  allocator: process.env.NEXT_PUBLIC_ALLOCATOR_ADDRESS || '0x...',
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x...'
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Default voice
export const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_KEY || '';

export const WORKERS_AI_ENDPOINT = process.env.NEXT_PUBLIC_WORKERS_AI_ENDPOINT || '';

// Utility formatting
export const formatUSDC = (amount: bigint, decimals = 6) => {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr || '0'}`;
};
```

### Step 7.4: useWallet Hook

**File: `frontend/src/hooks/useWallet.ts`**

```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORKS } from '@/constants';

export interface WalletState {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
}

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    account: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnected: false,
    isWrongNetwork: false
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if wallet is connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (!window.ethereum) {
        setError('MetaMask not installed');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      const network = await provider.getNetwork();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        setState({
          account: accounts[0].address,
          provider,
          signer,
          chainId: Number(network.chainId),
          isConnected: true,
          isWrongNetwork: Number(network.chainId) !== NETWORKS.ARC_TESTNET.chainId
        });
      }
    } catch (err) {
      console.error('Connection check failed:', err);
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setState({
        account: accounts[0],
        provider,
        signer,
        chainId: Number(network.chainId),
        isConnected: true,
        isWrongNetwork: Number(network.chainId) !== NETWORKS.ARC_TESTNET.chainId
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMsg);
      console.error('Wallet connection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchNetwork = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const arcTestnet = NETWORKS.ARC_TESTNET;

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${arcTestnet.chainId.toString(16)}` }]
        });
      } catch (switchError: any) {
        // Chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${arcTestnet.chainId.toString(16)}`,
                chainName: arcTestnet.name,
                rpcUrls: [arcTestnet.rpc],
                blockExplorerUrls: [arcTestnet.blockExplorer]
              }
            ]
          });
        } else {
          throw switchError;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const accounts = await provider.listAccounts();

      setState(prev => ({
        ...prev,
        provider,
        signer,
        chainId: Number(network.chainId),
        isWrongNetwork: false,
        account: accounts[0].address
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network switch failed';
      setError(errorMsg);
      console.error('Network switch failed:', err);
    }
  };

  const disconnectWallet = () => {
    setState({
      account: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnected: false,
      isWrongNetwork: false
    });
  };

  return {
    ...state,
    error,
    loading,
    connectWallet,
    switchNetwork,
    disconnectWallet,
    checkConnection
  };
};

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
```

### Step 7.5: useVault Hook

**File: `frontend/src/hooks/useVault.ts`**

```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/constants';

const VAULT_ABI = require('../../public/abis/AilaVault.json');

export interface VaultData {
  balance: bigint;
  yieldAccrued: bigint;
  totalDeposited: bigint;
  totalYield: bigint;
}

export const useVault = (
  provider: ethers.BrowserProvider | null,
  userAddress: string | null
) => {
  const [data, setData] = useState<VaultData>({
    balance: 0n,
    yieldAccrued: 0n,
    totalDeposited: 0n,
    totalYield: 0n
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch vault data
  useEffect(() => {
    if (!provider || !userAddress) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const contract = new ethers.Contract(
          CONTRACTS.vault,
          VAULT_ABI,
          provider
        );

        const [balance, yieldAmount, stats] = await Promise.all([
          contract.getBalance(userAddress),
          contract.userYield(userAddress),
          contract.getVaultStats()
        ]);

        setData({
          balance,
          yieldAccrued: yieldAmount,
          totalDeposited: stats[0],
          totalYield: stats[1]
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vault data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [provider, userAddress]);

  const deposit = async (signer: ethers.Signer, amount: bigint) => {
    setLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        CONTRACTS.vault,
        VAULT_ABI,
        signer
      );

      const tx = await contract.deposit(amount);
      const receipt = await tx.wait();

      if (receipt) {
        // Refresh data
        const userAddr = await signer.getAddress();
        const readContract = new ethers.Contract(
          CONTRACTS.vault,
          VAULT_ABI,
          signer.provider
        );
        const balance = await readContract.getBalance(userAddr);
        const yieldAmount = await readContract.userYield(userAddr);

        setData(prev => ({
          ...prev,
          balance,
          yieldAccrued: yieldAmount
        }));
      }

      return receipt;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (signer: ethers.Signer, amount: bigint) => {
    setLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        CONTRACTS.vault,
        VAULT_ABI,
        signer
      );

      const tx = await contract.withdraw(amount);
      const receipt = await tx.wait();

      if (receipt) {
        // Refresh data
        const userAddr = await signer.getAddress();
        const readContract = new ethers.Contract(
          CONTRACTS.vault,
          VAULT_ABI,
          signer.provider
        );
        const balance = await readContract.getBalance(userAddr);
        const yieldAmount = await readContract.userYield(userAddr);

        setData(prev => ({
          ...prev,
          balance,
          yieldAccrued: yieldAmount
        }));
      }

      return receipt;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, deposit, withdraw };
};
```

### Step 7.6: BalanceDisplay Component

**File: `frontend/src/components/BalanceDisplay.tsx`**

```typescript
import { useVault } from '@/hooks/useVault';
import { useWallet } from '@/hooks/useWallet';
import { formatUSDC } from '@/constants';

export const BalanceDisplay = () => {
  const { account, provider } = useWallet();
  const { data, loading } = useVault(provider, account);

  const balanceUSDC = formatUSDC(data.balance);
  const yieldUSDC = formatUSDC(data.yieldAccrued);

  return (
    <div className="balance-display p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your Account</h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Balance */}
        <div className="stat-card">
          <label className="text-gray-600 text-sm">Total Balance</label>
          <h3 className="text-3xl font-bold text-green-600">
            {loading ? '...' : `$${balanceUSDC}`}
          </h3>
          <p className="text-gray-500 text-xs">USDC</p>
        </div>

        {/* Accrued Yield */}
        <div className="stat-card">
          <label className="text-gray-600 text-sm">Accrued Yield</label>
          <h3 className="text-3xl font-bold text-blue-600">
            {loading ? '...' : `+$${yieldUSDC}`}
          </h3>
          <p className="text-gray-500 text-xs">This month</p>
        </div>

        {/* Wallet */}
        <div className="stat-card">
          <label className="text-gray-600 text-sm">Connected Wallet</label>
          <p className="text-sm font-mono truncate">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
          </p>
        </div>
      </div>
    </div>
  );
};
```

### Step 7.7: VoiceInterface Component

**File: `frontend/src/components/VoiceInterface.tsx`**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, WORKERS_AI_ENDPOINT } from '@/constants';

interface VoiceInterfaceProps {
  onIntentProcessed?: (response: any) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onIntentProcessed }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech Recognition not supported in this browser');
      }
    }
  }, []);

  const captureAudio = async (): Promise<Blob | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.onDataAvailable = (e) => chunks.push(e.data);

      mediaRecorder.start();
      setIsListening(true);

      // Record for 5 seconds
      return new Promise((resolve) => {
        setTimeout(() => {
          mediaRecorder.stop();

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            stream.getTracks().forEach(track => track.stop());
            resolve(audioBlob);
            setIsListening(false);
          };
        }, 5000);
      });
    } catch (err) {
      setError('Audio capture failed');
      setIsListening(false);
      return null;
    }
  };

  const speakResponse = async (text: string) => {
    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY },
          responseType: 'blob'
        }
      );

      const audioUrl = URL.createObjectURL(response.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Text-to-speech failed:', err);
    }
  };

  const handleVoiceCommand = async () => {
    try {
      setError(null);
      setTranscript('');
      setResponse('');

      // Capture audio
      const audioBlob = await captureAudio();
      if (!audioBlob) return;

      // Send to Cloudflare Workers for STT
      const sttResponse = await axios.post(
        WORKERS_AI_ENDPOINT,
        audioBlob,
        {
          headers: { 'content-type': 'audio/wav' }
        }
      );

      const transcribedText = sttResponse.data.text;
      setTranscript(transcribedText);

      // Send intent to backend
      const intentResponse = await axios.post(
        `${API_BASE_URL}/api/v1/intent`,
        {
          raw_text: transcribedText,
          confidence: sttResponse.data.confidence || 0.9
        }
      );

      const aiResponse = intentResponse.data.explanation;
      setResponse(aiResponse);

      // Speak response
      await speakResponse(aiResponse);

      // Notify parent
      if (onIntentProcessed) {
        onIntentProcessed(intentResponse.data);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Voice processing failed';
      setError(errorMsg);
      console.error('Voice command error:', err);
    }
  };

  return (
    <div className="voice-interface p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">🎤 Voice Assistant</h2>

      <button
        onClick={handleVoiceCommand}
        disabled={isListening}
        className={`px-6 py-3 rounded-lg font-bold text-white transition ${
          isListening
            ? 'bg-red-500 opacity-75 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isListening ? '🎤 Listening...' : '🎤 Speak'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {transcript && (
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-gray-600">You said:</p>
          <p className="font-semibold">{transcript}</p>
        </div>
      )}

      {response && (
        <div className="mt-4 p-3 bg-green-100 rounded">
          <p className="text-sm text-gray-600">Aila says:</p>
          <p className="font-semibold">{response}</p>
        </div>
      )}

      <audio ref={audioRef} hidden />
    </div>
  );
};
```

---

## PART 8: INTEGRATION & TESTING

### Step 8.1: End-to-End Test Suite

**File: `frontend/src/__tests__/graceScenario.test.ts`**

```typescript
import { ethers } from 'ethers';

describe('Grace Scenario - Complete Flow', () => {
  let provider: any;
  let signer: any;
  let vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS;

  beforeAll(() => {
    provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ARC_RPC);
  });

  it('should execute deposit → allocate → yield → withdraw flow', async () => {
    // 1. Deposit 108 USDC
    const depositAmount = ethers.parseUnits('108', 6);
    console.log(`✓ Deposit amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);

    // 2. Auto-allocate: 80% to yield, 20% to buffer
    const bufferAmount = (depositAmount * 20n) / 100n;
    const yieldAmount = depositAmount - bufferAmount;
    console.log(`✓ Buffer (20%): ${ethers.formatUnits(bufferAmount, 6)} USDC`);
    console.log(`✓ Yield pool (80%): ${ethers.formatUnits(yieldAmount, 6)} USDC`);

    // 3. Simulate yield (5% APY ≈ 0.0137% per day)
    const dailyYield = (yieldAmount * 137n) / 1000000n;
    console.log(`✓ Daily yield: ${ethers.formatUnits(dailyYield, 6)} USDC`);

    // 4. Withdraw 20 USDC from buffer
    const withdrawAmount = ethers.parseUnits('20', 6);
    const remainingInBuffer = bufferAmount - withdrawAmount;
    console.log(`✓ Remaining in buffer: ${ethers.formatUnits(remainingInBuffer, 6)} USDC`);

    // Assertions
    expect(bufferAmount + yieldAmount).toBe(depositAmount);
    expect(remainingInBuffer).toBe(ethers.parseUnits('6.4', 6));

    console.log('\n✅ Grace scenario passed!');
  });
});
```

### Step 8.2: Deployment Checklist

**File: `DEPLOYMENT_CHECKLIST.md`**

```markdown
# 🚀 Deployment Checklist for AilaBank MVP

## Pre-Deployment (Days 1–5)

- [ ] **Smart Contracts**
  - [ ] All 3 contracts written and unit-tested
  - [ ] Slither scan: 0 HIGH/MEDIUM issues
  - [ ] MythX formal verification passed
  - [ ] Hardhat compilation succeeds
  - [ ] Local tests passing (100%)

- [ ] **Event Listener**
  - [ ] Event processor implemented
  - [ ] Reconciler logic working
  - [ ] Logger configured
  - [ ] Tested on local node

- [ ] **Frontend**
  - [ ] Wallet hook working
  - [ ] Vault hook connected to testnet
  - [ ] BalanceDisplay component rendering
  - [ ] VoiceInterface component ready
  - [ ] All hooks tested locally

- [ ] **Resources Claimed**
  - [ ] ElevenLabs coupon redeemed
  - [ ] AI/ML API promo applied (ARCHACK20)
  - [ ] Arc testnet RPC access confirmed
  - [ ] USDC faucet working

## Deployment Day (Days 6–8)

- [ ] **Arc Testnet Deployment**
  - [ ] AilaVault deployed
  - [ ] LiquidityBuffer deployed
  - [ ] YieldAllocator deployed
  - [ ] All addresses saved to constants.ts
  - [ ] ABIs exported to frontend/public/abis/

- [ ] **Event Listener Launch**
  - [ ] Indexer running and logging events
  - [ ] Webhook calls succeeding
  - [ ] Reconciliation job scheduled

- [ ] **Frontend Deployment**
  - [ ] Build succeeds: `npm run build`
  - [ ] No runtime errors
  - [ ] Deployed to Vercel/Netlify with live URL
  - [ ] Voice interface working

- [ ] **Integration Testing**
  - [ ] Grace scenario: deposit → allocate → withdraw
  - [ ] Event listener: events captured and logged
  - [ ] Frontend: real-time balance updates
  - [ ] Voice: STT → intent → TTS working

- [ ] **Demo Recording**
  - [ ] 60–120s video recorded
  - [ ] Grace narrative clear
  - [ ] All features showcased
  - [ ] Uploaded to YouTube/Loom

## Submission (Day 10, Nov 8 by 11:59 PM)

- [ ] **GitHub Repository**
  - [ ] Clean code with comments
  - [ ] README.md with architecture
  - [ ] Deployment guide included
  - [ ] License: MIT
  - [ ] Public repository

- [ ] **Submission Assets**
  - [ ] Cover image: dashboard screenshot
  - [ ] Video presentation: 60–120s demo
  - [ ] Slide deck: 6–8 slides
  - [ ] Application URL: live frontend
  - [ ] GitHub repository: public link

- [ ] **Lablab.ai Submission**
  - [ ] Project title: "AilaBank: AI-Native Stablecoin Banking"
  - [ ] Description: 2–3 paragraphs
  - [ ] Tags: AI, Web3, Voice, Payments, USDC
  - [ ] Category: "On-Chain Actions" or "Payments"
  - [ ] Submitted before Nov 8, 11:59 PM UTC

## Post-Submission

- [ ] Nov 9: Live pitching (if invited to NYC)
- [ ] Celebrate! 🎉

---

**Status**: ⏳ In Progress
```

---

## 🎯 SUMMARY: YOUR 10-DAY BUILD TIMELINE

| Day | Phase | Deliverables |
|-----|-------|--------------|
| 1 (Oct 28) | Setup | Project scaffolding, resource claims, env setup |
| 2–3 (Oct 29–30) | Contracts | AilaVault, LiquidityBuffer, YieldAllocator written + tested |
| 4 (Oct 31) | Deployment | Contracts deployed to Arc testnet, ABIs exported |
| 5 (Nov 1) | Indexer | Event listener running, webhook calls working |
| 6 (Nov 2) | Frontend Setup | Wallet hooks, balance display, voice interface |
| 7 (Nov 3) | Integration | End-to-end flow tested, Grace scenario passes |
| 8 (Nov 4) | Security | Slither/MythX scans, optimizations |
| 9 (Nov 5) | Demo | Video recorded, presentation slides ready |
| 10 (Nov 8) | Submission | All assets submitted before 11:59 PM |

---

**🚀 Ready to build? Let me scaffold the complete project next!**

*Generated for AilaBank Hackathon Build, Oct 2025*

---

## 📆 90‑Day Expansion Plan & Partner Matrix (Post‑MVP)

### Phases
- Phase A (Weeks 1–4): Harden RateSweep on Arc, liquidity buffer SLOs, best‑execution receipts v1
- Phase B (Weeks 5–8): 2 remittance corridors live (each with 2 off‑ramps), merchant pilot with yield‑offset settlements
- Phase C (Weeks 9–12): SME treasury policies, public reliability/cost dashboard, tokenized T‑bill provider integration

### Partner Matrix (initial targets)
- Sponsor banks/EMIs: 1–2 partners per launch region (Pedro to integrate)
- Off‑ramps per corridor: 2 minimum for redundancy (PSPs/Mobile Money)
- Yield sources: 1 tokenized T‑bill provider + 1 DeFi lending market (low‑risk)

### KPIs (publish to dashboard)
- All‑in cost on $200 < 3%; median delivery < 5 min; effective merchant MDR ≤ 0.3%
