# Contract ABIs and Configuration

This directory contains the smart contract ABIs and configuration for the Aila Bank frontend.

## 📁 Structure

```
app/lib/contracts/
├── index.ts                    # Main exports
├── config.ts                   # Contract addresses and network config
├── AilaVaultABI.json          # AilaVault contract ABI
├── LiquidityBufferABI.json    # LiquidityBuffer contract ABI
└── YieldAllocatorABI.json     # YieldAllocator contract ABI
```

## 🔄 ABI Source

The ABIs are sourced from the compiled contracts:

**Source:** `/contracts/abi/` (auto-generated from `/contracts/artifacts/`)

To update ABIs after recompiling contracts, run from project root:

```bash
node -e "
const fs = require('fs');

// Read ABIs from contracts/abi
const ailaVault = JSON.parse(fs.readFileSync('./contracts/abi/AilaVault.json', 'utf8'));
const liquidityBuffer = JSON.parse(fs.readFileSync('./contracts/abi/LiquidityBuffer.json', 'utf8'));
const yieldAllocator = JSON.parse(fs.readFileSync('./contracts/abi/YieldAllocator.json', 'utf8'));

// Create ABI exports (extract just the ABI array)
fs.writeFileSync('./app/lib/contracts/AilaVaultABI.json', JSON.stringify(ailaVault.abi, null, 2));
fs.writeFileSync('./app/lib/contracts/LiquidityBufferABI.json', JSON.stringify(liquidityBuffer.abi, null, 2));
fs.writeFileSync('./app/lib/contracts/YieldAllocatorABI.json', JSON.stringify(yieldAllocator.abi, null, 2));

console.log('✅ ABIs updated successfully!');
"
```

## 📝 Environment Variables

Create a `.env.local` file in the `/app` directory with:

```env
# Contract Addresses (from deployments.json)
NEXT_PUBLIC_AILA_VAULT_ADDRESS=0x...
NEXT_PUBLIC_LIQUIDITY_BUFFER_ADDRESS=0x...
NEXT_PUBLIC_YIELD_ALLOCATOR_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# Arc Testnet RPC (optional, has default)
NEXT_PUBLIC_ARC_RPC_URL=https://rpc-sepolia.arcscan.app
```

## 🔧 Usage

### Import ABIs and Config

```typescript
import { 
  AilaVaultABI, 
  LiquidityBufferABI, 
  YieldAllocatorABI,
  CONTRACTS,
  CHAIN_ID,
  ARC_TESTNET_CONFIG 
} from '@/lib/contracts'

// Use in contract initialization
const vault = new ethers.Contract(
  CONTRACTS.AILA_VAULT,
  AilaVaultABI,
  provider
)
```

### Available Exports

**ABIs:**
- `AilaVaultABI` - Array of ABI definitions
- `LiquidityBufferABI` - Array of ABI definitions  
- `YieldAllocatorABI` - Array of ABI definitions

**Config:**
- `CONTRACTS` - Object with contract addresses
  - `CONTRACTS.AILA_VAULT`
  - `CONTRACTS.LIQUIDITY_BUFFER`
  - `CONTRACTS.YIELD_ALLOCATOR`
  - `CONTRACTS.USDC`
- `CHAIN_ID` - Arc Testnet chain ID (5042002)
- `RPC_URL` - Arc Testnet RPC endpoint
- `ARC_TESTNET_CONFIG` - Full network config for wallet_addEthereumChain
- `USDC_DECIMALS` - USDC token decimals (6)

## 🔄 After Deployment

After deploying contracts to Arc Testnet:

1. Copy contract addresses from `/contracts/deployments.json`
2. Update `.env.local` in `/app` directory
3. If ABIs changed, run the update script above
4. Restart the dev server

## 📦 Integration

The following hooks are already configured:
- `/app/hooks/useWallet.ts` - Wallet connection with Arc Testnet
- `/app/hooks/useVault.ts` - Vault interactions

Both hooks import from `@/lib/contracts` for consistency.
