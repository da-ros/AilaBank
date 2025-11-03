# 🚀 AilaBank - Quick Start Guide

Get your AI-powered blockchain bank running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ MetaMask browser extension
- ✅ Contracts deployed to Arc testnet (see `contracts/DEPLOYMENT.md`)
- ✅ Testnet USDC in your wallet

## Step 1: Clone & Install (2 min)

```bash
cd app
npm install
```

## Step 2: Configure Environment (1 min)

Create `.env.local` from template:

```bash
cp .env.example .env.local
```

**Edit `.env.local` with your deployed contract addresses:**

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc-testnet.arcscan.io
NEXT_PUBLIC_ARC_CHAIN_ID=5042002

# YOUR DEPLOYED ADDRESSES (from contracts deployment)
NEXT_PUBLIC_AILA_VAULT_ADDRESS=0xYourVaultAddress
NEXT_PUBLIC_USDC_ADDRESS=0xYourUSDCAddress
```

## Step 3: Copy Contract ABIs (30 sec)

```bash
# From your contracts folder
cp ../contracts/artifacts/contracts/AilaVault.sol/AilaVault.json public/abis/
```

Or if ABIs already exist in `/app/public/abis/`, you're good to go!

## Step 4: Run Development Server (30 sec)

```bash
npm run dev
```

Open [http://localhost:3000/agentic-dashboard](http://localhost:3000/agentic-dashboard)

## Step 5: Connect Wallet & Test (1 min)

1. Click **"Connect Wallet"** in header
2. Approve MetaMask connection
3. Switch to Arc testnet (app will prompt)
4. Try voice or chat:

### Voice Test 🎤
- Click microphone button
- Say: **"What's my balance?"**
- Aila responds with your account info

### Chat Test 💬
- Type: **"deposit 10 USDC"**
- Aila executes blockchain transaction
- Balance updates in real-time

## 🎯 Demo Commands

```
"Deposit 100 USDC"          → Deposits to vault
"What's my balance?"        → Shows principal, yield, total
"Withdraw 50 dollars"       → Withdraws from vault
"How much yield earned?"    → Shows yield stats
"Show my APY"               → Current yield percentage
```

## 🔧 Optional: Enable Full Voice Features

For production-quality voice AI:

### 1. ElevenLabs (Text-to-Speech)

```bash
# Get API key from https://elevenlabs.io
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

### 2. Cloudflare Workers AI (Speech-to-Text)

```bash
# Get from https://dash.cloudflare.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_token
```

### 3. OpenAI Whisper (Fallback STT)

```bash
OPENAI_API_KEY=your_openai_key
```

**Without these:** Voice still works using browser APIs (less accurate but functional for demo)

## 🐛 Quick Fixes

### "Wallet not connected"
```bash
# Make sure MetaMask is installed and unlocked
# Click "Connect Wallet" button
```

### "Wrong network"
```bash
# App will auto-prompt to switch to Arc testnet
# Confirm in MetaMask
```

### "Contract not found"
```bash
# Verify contract addresses in .env.local
# Ensure contracts are deployed on Arc testnet
```

### "Insufficient funds"
```bash
# Get testnet USDC from faucet:
https://faucet.arc.network

# Need both:
# - USDC for deposits
# - Native tokens for gas (also USDC on Arc!)
```

## 📊 What You Should See

After connecting wallet, the dashboard shows:

- **Total Balance** - Principal + Yield
- **Principal** - Your deposits
- **Yield Earned** - Interest accrued
- **TVL** - Total platform value
- **Voice Agent** - Microphone interface
- **Chat Agent** - Text conversation

## 🎬 Record Demo Video

For hackathon submission:

1. Open OBS/Screen Recorder
2. Navigate to `/agentic-dashboard`
3. Show:
   - Connecting wallet
   - Checking balance via voice
   - Depositing via chat
   - Real-time balance update
   - Blockchain transaction confirmed
4. Explain: "Users never see blockchain complexity - just talk to Aila!"

## 🏆 Key Demo Points

- ✅ **Voice-First**: Natural language, not forms
- ✅ **AI-Powered**: Intent parsing, no buttons
- ✅ **Real Blockchain**: Actual USDC on Arc
- ✅ **Instant Feedback**: Events update UI immediately
- ✅ **User-Friendly**: Banking UX, not crypto UX

## 📖 Next Steps

- Read `FRONTEND_INTEGRATION.md` for architecture details
- Check `app/hooks/useVault.ts` to understand contract calls
- Explore `components/voice/VoiceAgent.tsx` for voice AI logic
- Review `app/api/voice/*` endpoints for STT/TTS

## 🎯 Production Checklist

Before deploying:

- [ ] Set all environment variables
- [ ] Test all voice commands
- [ ] Test all chat commands
- [ ] Verify deposits work
- [ ] Verify withdrawals work
- [ ] Check balance updates
- [ ] Test on mobile
- [ ] Record demo video

## 🚀 Deploy to Production

```bash
# Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

Environment variables must be set in your deployment platform!

---

**Need Help?** Check the main `README.md` or open an issue.

**Ready to Ship?** You have a working AI agent bank! 🎉
