# ✅ AilaBank Integration Checklist

Complete this checklist to go from code to working demo!

## 📋 Pre-Flight Checklist

### Contracts (Required First)
- [ ] AilaVault.sol deployed to Arc testnet
- [ ] LiquidityBuffer.sol deployed to Arc testnet  
- [ ] YieldAllocator.sol deployed to Arc testnet
- [ ] USDC contract address obtained
- [ ] Contract ABIs exported
- [ ] All contracts verified on Arc explorer
- [ ] Test deposit/withdraw from Hardhat console

**If not done:** Follow `contracts/DEPLOYMENT.md`

### Testnet Setup
- [ ] MetaMask installed in browser
- [ ] Arc testnet added to MetaMask
- [ ] Testnet USDC obtained from faucet
- [ ] Test wallet has USDC for gas + deposits

**Faucet:** https://faucet.arc.network

## 🔧 Frontend Configuration

### 1. Environment Variables

```bash
cd app
cp .env.example .env.local
```

Edit `.env.local`:

```env
# ✅ Required
NEXT_PUBLIC_ARC_RPC_URL=https://rpc-testnet.arcscan.io
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_AILA_VAULT_ADDRESS=0x________________
NEXT_PUBLIC_USDC_ADDRESS=0x________________

# ✅ Optional (for production voice)
ELEVENLABS_API_KEY=sk_________________
CLOUDFLARE_API_TOKEN=________________
```

- [ ] All contract addresses filled
- [ ] RPC URL correct
- [ ] Chain ID correct

### 2. Contract ABIs

```bash
# From contracts folder
cd contracts
npm run compile

# Copy ABIs to frontend
cp artifacts/contracts/AilaVault.sol/AilaVault.json ../app/public/abis/
```

Verify:
- [ ] `app/public/abis/AilaVault.json` exists
- [ ] File contains `abi` field
- [ ] ABI matches deployed contract

### 3. Install Dependencies

```bash
cd app
npm install
```

Check:
- [ ] `ethers` package installed (v6+)
- [ ] No dependency errors
- [ ] `node_modules/` populated

## 🧪 Testing Phase

### 1. Start Development Server

```bash
npm run dev
```

- [ ] Server starts on port 3000
- [ ] No compilation errors
- [ ] Can access http://localhost:3000

### 2. Connect Wallet

Open http://localhost:3000/agentic-dashboard

- [ ] "Connect Wallet" button visible
- [ ] Click connects MetaMask
- [ ] Prompts to switch to Arc testnet
- [ ] Address shows in header after connect

### 3. Test Balance Query

**Voice Test:**
- [ ] Click microphone button
- [ ] Say: "What's my balance?"
- [ ] Microphone permission granted
- [ ] Voice transcribed correctly
- [ ] Aila responds with balance
- [ ] Audio plays back (if ElevenLabs configured)

**Chat Test:**
- [ ] Type: "what's my balance?"
- [ ] Message appears in chat
- [ ] Aila responds with balance info
- [ ] Shows principal, yield, total

### 4. Test Deposit

**Preparation:**
- [ ] Have 10+ USDC in test wallet
- [ ] USDC contract address correct

**Execute:**
- [ ] Say or type: "deposit 10 USDC"
- [ ] MetaMask popup appears
- [ ] Approve USDC spending first
- [ ] Then approve deposit transaction
- [ ] Wait for confirmation (few seconds)
- [ ] Balance updates automatically
- [ ] Aila confirms success

**Verify on Blockchain:**
- [ ] Check transaction on Arc explorer
- [ ] Verify Deposit event emitted
- [ ] Contract balance increased

### 5. Test Withdraw

**Execute:**
- [ ] Say or type: "withdraw 5 USDC"
- [ ] MetaMask popup appears
- [ ] Approve withdraw transaction
- [ ] Wait for confirmation
- [ ] Balance updates
- [ ] USDC received in wallet

**Verify:**
- [ ] Wallet USDC balance increased
- [ ] Vault balance decreased
- [ ] Transaction on Arc explorer

## 🎤 Voice Features (Optional)

### ElevenLabs Setup

1. Get API key: https://elevenlabs.io
2. Add to `.env.local`:
   ```
   ELEVENLABS_API_KEY=sk_your_key
   ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
   ```
3. Restart dev server

Test:
- [ ] Voice responses sound natural
- [ ] Latency acceptable (<2 seconds)
- [ ] No rate limit errors

### Cloudflare Workers AI Setup

1. Get token: https://dash.cloudflare.com
2. Add to `.env.local`:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_id
   CLOUDFLARE_API_TOKEN=your_token
   ```
3. Restart dev server

Test:
- [ ] Speech-to-text accurate
- [ ] Handles accents/noise
- [ ] No API errors

## 📱 Cross-Browser Testing

- [ ] Chrome/Brave - Voice + Chat work
- [ ] Firefox - Voice + Chat work
- [ ] Safari - Voice + Chat work (may need fallbacks)
- [ ] Mobile Chrome - UI responsive
- [ ] Mobile Safari - UI responsive

## 🐛 Common Issues & Fixes

### Issue: "Contract not found"
**Fix:**
```bash
# Verify contract address
cast code $CONTRACT_ADDRESS --rpc-url $ARC_RPC_URL

# Should return bytecode, not "0x"
```

### Issue: "Insufficient funds"
**Fix:**
```bash
# Get more testnet USDC
# Visit: https://faucet.arc.network
```

### Issue: "Transaction reverted"
**Fix:**
- Check you approved USDC spending
- Verify you have USDC balance
- Check contract is not paused
- Review transaction error in Arc explorer

### Issue: "Wrong network"
**Fix:**
- App should auto-prompt
- Manually add Arc testnet to MetaMask:
  - Network Name: Arc Testnet
  - RPC: https://rpc-testnet.arcscan.io
  - Chain ID: 5042002
  - Symbol: USDC

### Issue: "Voice not working"
**Fix:**
- Grant microphone permissions
- Check browser console for errors
- Verify API keys in `.env.local`
- Use chat interface as backup

## 🎬 Demo Recording Checklist

### Setup:
- [ ] Clean browser (no extensions visible)
- [ ] Maximized window
- [ ] Good lighting/audio
- [ ] Screen recorder ready (OBS/Loom)

### Demo Script:
1. [ ] Show landing page
2. [ ] Click "Connect Wallet"
3. [ ] Show Arc testnet switch
4. [ ] Show dashboard with $0 balance
5. [ ] **Voice:** "What's my balance?"
6. [ ] **Voice:** "Deposit 100 USDC"
7. [ ] Show MetaMask popup
8. [ ] Show transaction confirming
9. [ ] Show balance update to $100
10. [ ] **Chat:** "How much yield earned?"
11. [ ] **Voice:** "Withdraw 10 dollars"
12. [ ] Show final balance update
13. [ ] Show Arc explorer transaction

### Narration Points:
- [ ] "Users don't need crypto knowledge"
- [ ] "Just talk naturally to manage money"
- [ ] "AI handles blockchain complexity"
- [ ] "Real USDC on Arc testnet"
- [ ] "Instant feedback, transparent"

## 🚀 Deployment Checklist

### Environment Config:
- [ ] All secrets in deployment platform
- [ ] Production RPC endpoints
- [ ] API keys secured (not in code)
- [ ] CORS configured for API routes

### Testing:
- [ ] Wallet connection works
- [ ] Transactions execute
- [ ] Voice/chat functional
- [ ] Mobile responsive
- [ ] No console errors

### Documentation:
- [ ] README updated with live URL
- [ ] Demo video uploaded
- [ ] Architecture diagrams included
- [ ] API docs available

## 🏆 Hackathon Submission

- [ ] Live demo URL
- [ ] GitHub repo public
- [ ] Demo video (2-3 min)
- [ ] Pitch deck (optional)
- [ ] Team information
- [ ] Contract addresses documented
- [ ] README with setup instructions

## ✅ Final Checklist

**Before Submitting:**
- [ ] All features working end-to-end
- [ ] No critical bugs
- [ ] Demo video shows key features
- [ ] Code is clean and documented
- [ ] Contracts verified on Arc
- [ ] Frontend deployed and accessible

**You're Ready When:**
- ✅ A new user can open your app
- ✅ Say "deposit 100 USDC"
- ✅ Transaction executes on blockchain
- ✅ Balance updates instantly
- ✅ All with natural language only

---

## 🎉 Congratulations!

If all checkboxes are ✅, you have:
- A working AI blockchain bank
- Voice + chat interfaces
- Real smart contract integration
- Production-ready frontend
- Demo video ready to submit

**Time to ship! 🚀**
