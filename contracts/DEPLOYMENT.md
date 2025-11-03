# 🚀 Arc Testnet Deployment Guide

## Prerequisites

Arc Testnet uses **USDC as the native gas token**. This means you pay gas fees in USDC, not ETH!

## Step 1: Generate a Deployment Wallet

```bash
cd contracts
npx ts-node scripts/generate-wallet.ts
```

**Save the output securely:**
- Copy the **Private Key** to your `.env` file
- Save the **Mnemonic phrase** in a secure password manager
- Copy the **Address** - you'll need it for the faucet

## Step 2: Configure Environment

Update `contracts/.env`:

```bash
# Add your private key (DO NOT COMMIT THIS FILE!)
PRIVATE_KEY="0x..." # from step 1

# Arc Testnet RPC (already configured)
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network

# USDC Token Address on Arc Testnet
# Get this from Arc documentation or Circle
USDC_ADDRESS="0x..." # UPDATE THIS
```

## Step 3: Get Testnet USDC (Gas Token)

1. Visit: **https://faucet.circle.com**
2. Select: **Arc Testnet** from dropdown
3. Paste your wallet address from Step 1
4. Click **Request Tokens**
5. Wait for confirmation (~30 seconds)

**You should receive:**
- 10-100 USDC (for gas fees)
- This is testnet USDC with NO real value

## Step 4: Verify Readiness

Check that everything is configured:

```bash
npx ts-node scripts/check-deployment-readiness.ts
```

**Expected output:**
```
✅ Private key configured
✅ RPC URL configured  
✅ USDC address configured
✅ Connected to Arc Testnet
✅ Wallet Balance: 10.000000 USDC
✅ Sufficient USDC balance for deployment

🎉 ALL CHECKS PASSED! Ready to deploy!
```

## Step 5: Deploy Contracts

Deploy all three contracts to Arc Testnet:

```bash
npx hardhat run scripts/deploy.ts --network arc
```

**This will:**
1. Deploy `AilaVault.sol`
2. Deploy `LiquidityBuffer.sol`
3. Deploy `YieldAllocator.sol`
4. Connect all contracts together
5. Save addresses to `deployments.json`

**Deployment costs:** ~0.5-2 USDC in gas fees

## Step 6: Verify Deployment

After deployment completes, you'll see:

```
🎉 DEPLOYMENT SUCCESSFUL!
📋 Contract Addresses:
   AilaVault:        0x...
   LiquidityBuffer:  0x...
   YieldAllocator:   0x...
```

**Verify on Explorer:**
1. Visit: **https://testnet.arcscan.app**
2. Search for each contract address
3. View deployment transactions

## Troubleshooting

### ❌ "Insufficient funds for gas"
- **Solution:** Get more testnet USDC from https://faucet.circle.com
- Remember: USDC is the gas token on Arc!

### ❌ "Cannot connect to network"
- **Solution:** Check your internet connection
- Verify `ARC_TESTNET_RPC_URL` in `.env`
- Try: `https://rpc.testnet.arc.network`

### ❌ "Invalid private key"
- **Solution:** Ensure private key is 66 characters (0x + 64 hex)
- Regenerate wallet with: `npx ts-node scripts/generate-wallet.ts`

### ❌ "USDC_ADDRESS not set"
- **Solution:** Get USDC token address from Arc documentation
- Contact Arc team or check their Discord

## Next Steps After Deployment

1. **Update Frontend:**
   - Copy contract addresses from `deployments.json`
   - Update frontend config

2. **Test Contracts:**
   ```bash
   # Test deposit
   npx hardhat run scripts/test-deposit.ts --network arc
   
   # Check balances
   npx hardhat run scripts/check-balances.ts --network arc
   ```

3. **Set Up Event Indexer:**
   - Configure Supabase
   - Start indexing blockchain events
   - Build transaction history

4. **Security:**
   - Never commit `.env` file
   - Use different wallet for mainnet
   - Consider multisig for admin functions

## Important Notes

🔐 **Security:**
- The PRIVATE_KEY in `.env` controls real assets on mainnet
- Never share or commit this file
- Use a separate wallet for testnet vs mainnet

💰 **Gas on Arc:**
- Gas is paid in USDC (6 decimals)
- Typical transaction: 0.001-0.01 USDC
- Contract deployment: 0.5-2 USDC
- Always keep some USDC for gas!

📊 **USDC Token:**
- Arc has native USDC support
- USDC is both the gas token AND the vault asset
- Users deposit the same USDC they pay gas with

## Support

- **Arc Docs:** https://docs.arc.network
- **Arc Discord:** Join for testnet support
- **Circle Faucet:** https://faucet.circle.com
- **Explorer:** https://testnet.arcscan.app
