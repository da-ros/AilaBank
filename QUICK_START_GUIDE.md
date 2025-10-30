# ⚡ AilaBank — Quick Start Execution Guide (Ramspheld)

**Your step-by-step roadmap to ship MVP in 10 days.**

---

## 📋 QUICK REFERENCE: YOUR RESPONSIBILITIES

You are building:
1. ✅ **Smart Contracts** (AilaVault, LiquidityBuffer, YieldAllocator)
2. ✅ **Event Listener** (indexes Arc events, syncs to backend)
3. ✅ **Web3 Frontend** (wallet connection, balance display, contract interaction)
4. ✅ **Voice UI** (integrates Cloudflare Workers AI + ElevenLabs)

**Resources you're using:**
- **Arc Testnet** (blockchain)
- **USDC** (native gas + asset)
- **Hardhat** (contract dev/testing)
- **Next.js** (frontend)
- **Ethers.js** (Web3 library)
- **Cloudflare Workers AI** (STT/edge inference)
- **ElevenLabs** (TTS)

---

## 🎯 MVP Feature Focus (This build)
- Cross‑border remittances: corridor routing via sponsor banks/PSPs; best‑execution receipts
- Store of value: RateSweep allocations with instant liquidity buffer and in‑flight yield
- Merchant acceptance: invoices/subscriptions/refunds with yield‑offset settlement (“zero‑MDR”)
- SME treasury: policy rules (buffer %, APY thresholds), supplier autopay, audit‑ready receipts

Track KPIs as you test: all‑in cost on $200 < 3%, median delivery < 5 min, effective merchant MDR ≤ 0.3%.

## 🚀 EXECUTION TIMELINE

### **DAY 1: Setup (Oct 28)**

**Goal**: Bootstrap project, claim resources, seed code ready

**Tasks**:

1. **Clone repo & create structure**
   ```bash
   cd /home/ramspheld/Projects/Ramspheld/aila
   
   # Create folders
   mkdir -p contracts/{src/{interfaces,libraries},test,scripts,abi}
   mkdir -p indexer/src
   mkdir -p frontend/src/{hooks,components,pages,utils,__tests__}
   mkdir -p docs
   
   # Copy package.json files from IMPLEMENTATION_GUIDE_PART1.md & PART2.md
   ```

2. **Claim Hackathon Resources** (LIMITED TIME!)
   ```
   ☐ ElevenLabs coupon: https://lablab.ai/event/ai-agents-on-arc-with-usdc
      (Only 500 available! Do this first)
   ☐ AI/ML API promo: ARCHACK20 (use at checkout)
   ☐ Circle dev account: https://developers.circle.com
   ☐ Arc testnet RPC: https://testnet.arc.io/rpc
   ☐ USDC faucet: https://faucet.circle.com
   ```

3. **Setup Hardhat**
   ```bash
   cd contracts
   npm install
   npx hardhat
   # Select: TypeScript project
   ```

4. **Setup Frontend**
   ```bash
   cd ../frontend
   npx create-next-app@latest --typescript --tailwind
   npm install ethers axios
   ```

5. **Setup Indexer**
   ```bash
   cd ../indexer
   npm install ethers redis dotenv axios winston ts-node typescript
   ```

6. **Create .env files**
   ```bash
   cp contracts/.env.example contracts/.env
   cp indexer/.env.example indexer/.env
   cp frontend/.env.local.example frontend/.env.local
   
   # Fill in your values
   ```

**✅ Deliverable**: Project scaffolded, all dependencies installed, .env files ready

---

### **DAYS 2–3: Smart Contracts (Oct 29–30)**

**Goal**: All 3 contracts written, unit tested, ready to deploy

**Tasks**:

1. **Copy contract code from IMPLEMENTATION_GUIDE_PART1.md**
   ```bash
   # Copy into contracts/src/
   - AilaVault.sol
   - LiquidityBuffer.sol
   - YieldAllocator.sol
   ```

2. **Create test files**
   ```bash
   # Copy test code from IMPLEMENTATION_GUIDE_PART1.md
   # Into contracts/test/AilaVault.test.ts
   ```

3. **Compile & test locally**
   ```bash
   cd contracts
   npx hardhat compile
   # Should succeed with no errors
   
   npx hardhat test
   # Should see: ✓ All tests passing
   ```

4. **Run security scans** (optional but recommended)
   ```bash
   npm install -g slither-analyzer
   slither contracts/src/AilaVault.sol
   # Check for HIGH/MEDIUM issues
   ```

**✅ Deliverable**: 3 contracts compiled, all unit tests passing (100%)

---

### **DAY 4: Deployment to Arc Testnet (Oct 31)**

**Goal**: Contracts live on Arc, ABIs exported to frontend

**Tasks**:

1. **Get testnet USDC address**
   - Visit Circle docs or Arc testnet explorer
   - Save to `contracts/.env`: `USDC_ADDRESS_TESTNET=0x...`

2. **Create deployment script**
   ```bash
   # Copy deploy.ts from IMPLEMENTATION_GUIDE_PART1.md
   # Into contracts/scripts/deploy.ts
   ```

3. **Setup deployment config**
   ```bash
   # Edit contracts/hardhat.config.ts with Arc RPC
   # Update .env with your PRIVATE_KEY (testnet only!)
   ```

4. **Deploy to testnet**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network arc_testnet
   ```

   **Output**:
   ```
   ✅ AilaVault deployed to: 0xabc123...
   ✅ LiquidityBuffer deployed to: 0xdef456...
   ✅ YieldAllocator deployed to: 0xghi789...
   ✅ ABIs exported to contracts/abi/
   ```

5. **Copy ABIs to frontend**
   ```bash
   cp contracts/abi/*.json ../frontend/public/abis/
   ```

6. **Save contract addresses**
   ```bash
   # Update frontend/src/constants.ts with deployed addresses
   ```

**✅ Deliverable**: Contracts live on Arc testnet, ABIs in frontend

---

### **DAY 5: Event Listener (Nov 1)**

**Goal**: Listening to Arc events, pushing to backend

**Tasks**:

1. **Copy indexer code from IMPLEMENTATION_GUIDE_PART2.md**
   ```bash
   # Into indexer/src/
   - index.ts
   - eventProcessor.ts
   - reconciler.ts
   - logger.ts
   - types.ts
   ```

2. **Copy ABIs to indexer**
   ```bash
   mkdir -p indexer/abi
   cp contracts/abi/*.json indexer/abi/
   ```

3. **Update .env**
   ```bash
   # indexer/.env
   ARC_TESTNET_RPC=https://testnet.arc.io/rpc
   VAULT_ADDRESS=0x... (from deployment)
   BUFFER_ADDRESS=0x...
   ALLOCATOR_ADDRESS=0x...
   BACKEND_URL=http://localhost:3000
   ```

4. **Test locally**
   ```bash
   cd indexer
   npm run dev
   
   # Should see:
   # 🚀 IndexerService initialized
   # 👂 Starting event listeners...
   # ✅ Event listeners started
   ```

5. **Trigger a test deposit** (via frontend or manually)
   ```bash
   # Indexer should log:
   # 📥 Deposit event detected: {...}
   ```

**✅ Deliverable**: Event listener running, capturing Arc events

---

### **DAYS 6–7: Frontend Web3 (Nov 2–3)**

**Goal**: Connected to Arc, displaying real-time balances

**Tasks**:

1. **Copy hooks from IMPLEMENTATION_GUIDE_PART2.md**
   ```bash
   # Into frontend/src/hooks/
   - useWallet.ts
   - useVault.ts
   - useLiquidityBuffer.ts
   - useBalance.ts
   - useTransaction.ts
   ```

2. **Copy components from IMPLEMENTATION_GUIDE_PART2.md**
   ```bash
   # Into frontend/src/components/
   - WalletConnect.tsx
   - BalanceDisplay.tsx
   - TransactionHistory.tsx
   - VoiceInterface.tsx
   - WithdrawModal.tsx
   ```

3. **Setup constants**
   ```bash
   # Copy frontend/src/constants.ts from IMPLEMENTATION_GUIDE_PART2.md
   # Update with your contract addresses
   ```

4. **Build dashboard page**
   ```bash
   # Create frontend/src/pages/index.tsx
   # Use BalanceDisplay + VoiceInterface components
   ```

5. **Test locally**
   ```bash
   cd frontend
   npm run dev
   # Open http://localhost:3000
   # Click "Connect Wallet"
   # Should connect to Metamask/Circle wallet
   # Should show balance on Arc testnet
   ```

**✅ Deliverable**: Frontend connecting to Arc, displaying balances

---

### **DAY 8: Voice Integration (Nov 4)**

**Goal**: Voice capture → STT → intent → TTS response

**Tasks**:

1. **Deploy Cloudflare Workers endpoint** (for STT)
   ```bash
   # Create indexer/workers/intent-parser.ts
   # Reference: IMPLEMENTATION_GUIDE_PART2.md
   
   cd indexer/workers
   wrangler publish
   # Get URL: https://aila-intent.your-account.workers.dev
   ```

2. **Update frontend constants**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_WORKERS_AI_ENDPOINT=https://aila-intent.your-account.workers.dev
   NEXT_PUBLIC_ELEVENLABS_KEY=your_api_key
   ```

3. **Test voice interface**
   ```bash
   # Open http://localhost:3000
   # Click "🎤 Speak"
   # Say something like "Show my balance"
   # Should hear Aila respond via TTS
   ```

**✅ Deliverable**: Full voice loop working (speech → text → intent → response)

---

### **DAY 9: Integration & Testing (Nov 5)**

**Goal**: End-to-end "Grace scenario" working

**Tasks**:

1. **Test Grace Scenario**
   ```
   ✓ User connects wallet
   ✓ Says: "Deposit 100 euros"
   ✓ System converts to USDC
   ✓ Deposit recorded on Arc
   ✓ Event listener captures it
   ✓ Balance updates in UI
   ✓ Aila responds via TTS
   ✓ User withdraws $20
   ✓ Funds deducted from buffer
   ✓ All events logged
   ```

2. **Run test suite**
   ```bash
   cd frontend
   npm test
   # Should see: All tests passing ✅
   ```

3. **Security review**
   ```bash
   # Verify no private keys in code
   # No hardcoded secrets
   # HTTPS enabled
   ```

4. **Document architecture**
   ```bash
   # Create docs/ARCHITECTURE.md
   # Include system diagram
   # Data flow explanation
   ```

**✅ Deliverable**: Grace scenario works end-to-end, all tests passing

---

### **DAY 10: Demo & Submission (Nov 8)**

**Goal**: Record demo, prepare assets, submit by 11:59 PM UTC

**Tasks**:

1. **Record demo video** (60–120s)
   ```
   Script:
   - [0–10s] "Meet Grace, a freelancer earning in euros"
   - [10–20s] Voice command: "Deposit 100 euros"
   - [20–35s] Show balance update, yield allocation
   - [35–50s] Voice command: "Withdraw $20 to M-Pesa"
   - [50–60s] Impact: "Earned $0.32 in yield today"
   
   Tools: OBS, Loom, or built-in screen recorder
   Upload to: YouTube (unlisted) or Loom
   ```

2. **Prepare submission assets**
   ```bash
   ☐ Cover image: dashboard screenshot
   ☐ Demo video: YouTube/Loom link
   ☐ Slide deck: 6–8 slides (Figma/Google Slides)
   ☐ GitHub repo: Public, MIT license
   ☐ Live URL: Deployed frontend (Vercel/Netlify)
   ☐ README: Architecture, setup, usage
   ```

3. **Clean up GitHub repo**
   ```bash
   # Ensure:
   - No .env files committed
   - No node_modules/ committed
   - Code is formatted & commented
   - README is comprehensive
   - License: MIT
   ```

4. **Submit on lablab.ai**
   ```bash
   Navigate to: https://lablab.ai/event/ai-agents-on-arc-with-usdc/submit
   
   Fill:
   - Project title: "AilaBank: AI-Native Stablecoin Banking"
   - Description: 2–3 paragraphs
   - Cover image: Upload
   - Video: Paste YouTube/Loom link
   - Slides: Upload PDF
   - GitHub: Paste repo URL
   - Demo URL: Paste frontend URL
   
   Submit before Nov 8, 11:59 PM UTC
   ```

**✅ Deliverable**: Submission complete, all assets ready

---

## 📚 REFERENCE LINKS

### Contracts & Testing
- Hardhat: https://hardhat.org
- Solidity: https://docs.soliditylang.org
- OpenZeppelin: https://docs.openzeppelin.com/contracts
- Ethers.js: https://docs.ethers.org/v6

### Frontend
- Next.js: https://nextjs.org
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Vercel (hosting): https://vercel.com

### Blockchain
- Arc Testnet RPC: https://testnet.arc.io/rpc
- Circle SDK: https://developers.circle.com
- USDC Faucet: https://faucet.circle.com

### AI & Voice
- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai
- ElevenLabs: https://elevenlabs.io
- AI/ML API: https://aimlapi.com

### Hackathon
- lablab.ai: https://lablab.ai
- Event page: https://lablab.ai/event/ai-agents-on-arc-with-usdc
- Discord: lablab.ai Discord server

---

## ⚠️ CRITICAL REMINDERS

1. **Claim ElevenLabs coupon FIRST** — Only 500 available!
2. **Never commit .env files** — They contain secrets
3. **Test on Arc testnet before mainnet** — No real money needed
4. **Save deployed contract addresses** — You'll need them later
5. **Submit before Nov 8, 11:59 PM** — No extensions!

---

## 🎯 SUCCESS CHECKLIST

### By Day 3
- [ ] All 3 contracts written & tested locally
- [ ] Slither/MythX scans passed
- [ ] Ready for testnet deployment

### By Day 4
- [ ] Contracts live on Arc testnet
- [ ] ABIs exported to frontend/public/abis/
- [ ] Contract addresses saved in constants.ts

### By Day 5
- [ ] Event listener running
- [ ] Webhook calls to backend working
- [ ] Logs showing detected events

### By Day 7
- [ ] Frontend connects to Metamask/Circle
- [ ] Balance displays in real-time
- [ ] Wallet switching works

### By Day 8
- [ ] Voice capture working
- [ ] STT converting speech to text
- [ ] TTS responding with audio

### By Day 9
- [ ] Grace scenario: deposit → allocate → withdraw ✅
- [ ] All unit tests passing ✅
- [ ] No security issues found ✅

### By Day 10
- [ ] Demo video recorded & uploaded ✅
- [ ] Slides ready ✅
- [ ] GitHub repo public & documented ✅
- [ ] Submitted on lablab.ai ✅

---

## 💪 YOU'VE GOT THIS!

You have **everything you need** to build an MVP that:
- ✅ Uses **Arc's USDC-native layer-1**
- ✅ Implements **AI-driven voice banking**
- ✅ Demonstrates **real on-chain transactions**
- ✅ Shows **practical yield optimization**
- ✅ Tells a compelling **real-world story** (Grace)

**10 days. Clean code. Real impact. Let's ship it! 🚀**

---

*AilaBank Hackathon MVP Build Guide*  
*Oct 28 – Nov 8, 2025*  
*Team: Ramspheld (Contracts + Frontend), Pedro (AI + Backend), Florence (UX + Voice)*
