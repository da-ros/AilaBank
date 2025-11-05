# 🏗️ AilaBank — Architecture Diagrams & Data Flows

**Visual reference for system design, user flows, and data movements.**

---

## 0️⃣ Strategic Architecture Alignment (Blue Ocean)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AI Stablecoin Bank — Capability Map                       │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Cross-Border Payments        │  Any-currency in → USDC core → any-currency   │
│ (Corridor Router)            │  out; sponsor banks/PSPs per corridor;        │
│                              │  best-exec engine + proof receipts            │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Store of Value               │  RateSweep™ auto-allocates to safest yield,   │
│ (RateSweep Engine)           │  instant buffer, in-flight yield              │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Merchant & Retail Payments   │  USDC acceptance, invoices/subscriptions,     │
│ (Merchant Toolkit)           │  refunds, accounting exports; yield‑offset    │
│                              │  settlement (“zero-MDR”)                      │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Treasury & Cash Management   │  SME policies, laddered stablecoin/RWA,       │
│ (Policy & RWA Module)        │  supplier autopay, audit‑ready receipts       │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Compliance & Reliability     │  Corridor policy packs, Travel‑Rule payloads, │
│ (Policy Engine + Telemetry)  │  public reliability/cost dashboard            │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

- Best‑Rate Guarantee + Proof‑of‑Best‑Execution: quote, route, and spread are logged on‑chain/off‑chain for every conversion and transfer.
- Always‑liquid design: vault + liquidity buffer; yield allocator maintains ≥ min buffer and supports unwind to buffer.
- Voice‑first UX: every action can be triggered and explained by Aila (TTS/STT).

## 1️⃣ SYSTEM ARCHITECTURE (High-Level)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION LAYER                           │
│                                                                            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐          │
│  │   🎤 Voice   │     │   💬 Chat    │     │   📊 Dashboard   │          │
│  │  (ElevenLabs │     │  (Text/UX)   │     │   (React UI)     │          │
│  │   + Workers  │     │              │     │                  │          │
│  │   AI STT)    │     │              │     │                  │          │
│  └──────┬───────┘     └──────┬───────┘     └─────────┬────────┘          │
│         │                    │                       │                    │
│         └────────────────────┴───────────────────────┘                    │
│                              │                                             │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          AI INTELLIGENCE LAYER                            │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ Intent Recognition: "Deposit 100 EUR"                           │     │
│  │ Policy Decision: "Allocate 80% to yield, 20% buffer"           │     │
│  │ Reasoning: {"action":"deposit", "amount":100, ...}             │     │
│  │ Confidence: 0.94                                               │     │
│  └──────────────────────────────┬────────────────────────────────┘     │
│                                  │                                       │
│  ┌──────────────────────────────┴────────────────────────────────┐      │
│  │ → Backend API: /api/v1/intent (Pedro handles)                │      │
│  └──────────────────────────────┬────────────────────────────────┘      │
│                                  │                                       │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION ORCHESTRATION LAYER                        │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ User Service │  │ FX Converter │  │ Yield Engine │  │ Circle API   │ │
│  │              │  │              │  │              │  │              │ │
│  │ • Auth       │  │ • EUR→USDC   │  │ • Allocate   │  │ • Wallet mgr │ │
│  │ • Profile    │  │ • Best route │  │ • Rebalance  │  │ • Transfers  │ │
│  │ • Limits     │  │ • FX rates   │  │ • APY calc   │  │ • Off-ramps  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Event Bus (Redis): Queues all transactions for reliable delivery │    │
│  │ • deposit.confirmed → Trigger allocation                        │    │
│  │ • allocation.done → Update UI                                   │    │
│  │ • withdraw.requested → Fetch buffer or unwind yield            │    │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN & SMART CONTRACTS                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                  ARC (EVM-Compatible L1)                         │    │
│  │  Native Gas: USDC  |  Chain ID: 91002 (testnet)                 │    │
│  │                                                                   │    │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐   │    │
│  │  │  AilaVault.sol  │  │ LiquidityBuffer  │  │ YieldAlloctr │   │    │
│  │  │                 │  │                  │  │              │   │    │
│  │  │ • User balances │  │ • 20% buffer     │  │ • Allocations│   │    │
│  │  │ • Yield accrual │  │ • Instant W/D    │  │ • Harvesting│   │    │
│  │  │ • Events        │  │ • Health checks  │  │ • Rebalance  │   │    │
│  │  └────────┬────────┘  └────────┬─────────┘  └──────┬───────┘   │    │
│  │           │                    │                  │             │    │
│  │           └────────────────────┴──────────────────┘             │    │
│  │                        │                                         │    │
│  │    Events Emitted:     │                                         │    │
│  │    • Deposit           │                                         │    │
│  │    • Withdraw          │                                         │    │
│  │    • YieldAccrued      │                                         │    │
│  │    • Rebalanced        │                                         │    │
│  │                        │                                         │    │
│  └────────────────────────┼─────────────────────────────────────────┘   │
│                           │                                               │
└───────────────────────────┼───────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         EVENT INDEXER LAYER                               │
│                                                                            │
│  You build this service (indexer/src/index.ts):                          │
│                                                                            │
│  Arc RPC ──[WebSocket]──> Detect Events ──[Webhook]──> Backend API      │
│  Subscribe to:                    │                                       │
│  • Deposit events            Event Processor                              │
│  • Withdraw events        Reconciliation                                 │
│  • Yield events                  │                                       │
│                                  ├─> Postgres (off-chain ledger)         │
│                                  └─> Redis (cache)                       │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ USER FLOW: GRACE'S DEPOSIT & WITHDRAW JOURNEY

```
GRACE (Nairobi, Kenya)
│
├─ 1. Opens AilaBank frontend
│   │
│   ├─ Connects Metamask wallet
│   └─ Network switched to Arc testnet
│
├─ 2. Says: "Deposit 100 euros"
│   │
│   ├─ Voice captured (Web Audio API)
│   ├─ Sent to Cloudflare Workers AI (STT)
│   │  └─ Output: "Deposit 100 euros" (confidence: 0.95)
│   │
│   └─ Sent to Backend (/api/v1/intent)
│      │
│      ├─ Pedro's system:
│      │  ├─ Parse intent: deposit, amount=100, currency=EUR
│      │  ├─ Query FX service: EUR/USDC rate = 1.082
│      │  ├─ Calculate: 100 EUR × 1.082 = 108.2 USDC
│      │  └─ Approve Circle wallet for USDC transfer
│      │
│      └─ Response to frontend: "Converting 100 EUR to 108.2 USDC"
│
├─ 3. Aila responds via TTS (ElevenLabs)
│   │
│   └─ Grace hears: "I'm converting your euros to USDC at the best rate..."
│
├─ 4. Backend triggers deposit to Arc
│   │
│   ├─ Call contract: AilaVault.deposit(108.2 × 10^6)
│   │  ├─ Record in vault: user_balance = 108.2 USDC
│   │  ├─ Emit event: Deposit(grace_address, 108.2e6, timestamp)
│   │  └─ TX hash: 0xabc123...
│   │
│   └─ Event Listener (You) detects event
│      │
│      ├─ Parse Deposit event
│      ├─ Send webhook to backend: /api/v1/deposit/ack
│      └─ Log to Postgres & Redis cache
│
├─ 5. AI auto-allocates (backend decision)
│   │
│   ├─ Policy: For new deposits, allocate 80% to yield, 20% to buffer
│   │
│   ├─ Calculate:
│   │  ├─ Yield pool: 108.2 × 0.8 = 86.56 USDC
│   │  └─ Buffer pool: 108.2 × 0.2 = 21.64 USDC
│   │
│   ├─ Call: YieldAllocator.allocate(86.56e6, yield_pool_address)
│   ├─ Call: LiquidityBuffer.deposit(21.64e6)
│   │
│   └─ Events emitted → Indexer logs → Backend records
│
├─ 6. Frontend updates in real-time
│   │
│   ├─ useVault hook fetches new balance: 108.2 USDC
│   ├─ BalanceDisplay shows: "$108.20 USDC"
│   ├─ YieldStats shows: "20% in instant buffer, 80% earning yield"
│   └─ Grace sees: "Your balance is now $108.20"
│
├─ 7. Hours pass... yield accrues
│   │
│   ├─ Yield pools earn ~0.0137% per day (5% APY)
│   ├─ Daily yield on 86.56 USDC ≈ $0.012 USDC
│   ├─ Backend calls: AilaVault.accumulateYield(grace, 0.012e6)
│   └─ Frontend shows: "Earned +$0.012 today"
│
├─ 8. Grace needs $20 USD urgently
│   │
│   └─ Says: "Withdraw 20 dollars"
│
├─ 9. Backend checks liquidity
│   │
│   ├─ Is 20 USDC available in buffer (21.64)?  YES
│   ├─ Call: LiquidityBuffer.withdraw(20e6, grace_address)
│   │
│   └─ Buffer now: 21.64 - 20 = 1.64 USDC
│
├─ 10. Convert USDC → Local currency
│   │
│   ├─ Backend: 20 USDC → 20 USD (1:1 for simplicity)
│   ├─ Send to Circle off-ramp
│   └─ Circle sends to Grace's M-Pesa wallet
│
├─ 11. Events emitted → Indexer logs
│   │
│   ├─ Withdraw event detected
│   ├─ Webhook: /api/v1/withdraw/ack
│   └─ Logged to audit trail
│
└─ 12. Aila confirms via TTS
    │
    ├─ "20 USDC sent to your M-Pesa"
    ├─ "Your remaining balance: $88.20"
    ├─ "You've earned $0.012 in yield today"
    │
    └─ Grace hears her money is safe, growing, and accessible ✅

═══════════════════════════════════════════════════════════════════

RESULT:
✅ Grace deposited 100 EUR (converted to USDC)
✅ Auto-allocated 80/20 (yield/buffer)
✅ Earned yield while her money was deployed
✅ Withdrew $20 instantly from buffer
✅ All on blockchain, transparent, auditable
```

---

## 3️⃣ DATA FLOW: DEPOSIT TO ALLOCATION

```
Grace: "Deposit 100 euros"
        │
        ▼ (Web Audio API)
┌──────────────────────┐
│ Microphone Input     │ (Browser)
│ Audio Blob (5 sec)   │
└──────────┬───────────┘
           │
           ▼ (HTTPS)
┌──────────────────────────────────────────┐
│ Cloudflare Workers AI                    │ (Edge)
│ Model: Whisper Large v3 Turbo (STT)      │
│ Input: Audio blob                        │
│ Output: "Deposit 100 euros"              │
│         confidence: 0.95                 │
└──────────┬───────────────────────────────┘
           │
           ▼ (HTTPS)
┌──────────────────────────────────────────┐
│ Backend Orchestrator                     │ (Pedro)
│ Endpoint: /api/v1/intent                 │
│ Input JSON:                              │
│ {                                        │
│   "raw_text": "Deposit 100 euros",      │
│   "confidence": 0.95,                    │
│   "user_id": "grace_addr"                │
│ }                                        │
│                                          │
│ Processing:                              │
│ 1. Parse intent → {action: "deposit",   │
│                    amount: 100,          │
│                    currency: "EUR"}      │
│ 2. Query FX: EUR/USDC = 1.082           │
│ 3. Calculate: 100 * 1.082 = 108.2 USDC │
│ 4. Approve Circle wallet                │
│ 5. Build transaction                    │
│                                          │
│ Output JSON:                             │
│ {                                        │
│   "action": "deposit",                   │
│   "amount_original": 100,                │
│   "currency_from": "EUR",                │
│   "amount_converted": 108.2,             │
│   "currency_to": "USDC",                 │
│   "explanation": "Converting to USDC...",│
│   "tx_pending": true                     │
│ }                                        │
└──────────┬───────────────────────────────┘
           │
           ▼ (HTTPS + ElevenLabs)
┌──────────────────────────────────────────┐
│ Frontend receives response                │ (React)
│ 1. BalanceDisplay updates                │
│ 2. TransactionHistory adds pending TX    │
│ 3. VoiceInterface calls ElevenLabs TTS   │
│    Input: "Converting to USDC..."        │
│    Output: Audio blob                    │
│ 4. Play audio response                   │
└──────────┬───────────────────────────────┘
           │
           ▼ (Simultaneous)
┌──────────────────────────────────────────┐
│ Backend: Execute transaction              │ (Node.js)
│ Call Arc contract:                       │
│ AilaVault.deposit(108.2e6)              │
│                                          │
│ Contract processes:                      │
│ 1. Receive 108.2 USDC from user         │
│ 2. userBalances[grace] += 108.2e6       │
│ 3. totalDeposited += 108.2e6            │
│ 4. Emit event: Deposit(grace, 108.2e6) │
│ 5. Return TX hash                        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Arc Blockchain (Testnet)                 │ (On-Chain)
│ TX Confirmed ✅                          │
│ Block: 12345                             │
│ TX Hash: 0xabc123...                     │
│ User Balance: 108.2 USDC                 │
│ Total TVL: $500,000                      │
└──────────┬───────────────────────────────┘
           │
           ▼ (WebSocket Subscription)
┌──────────────────────────────────────────┐
│ Event Indexer (You)                      │ (Node.js)
│ Listens to Arc RPC                       │
│ Detects: Deposit event                   │
│ {                                        │
│   user: "grace_addr",                    │
│   amount: 108200000,  // 108.2e6        │
│   timestamp: 1699000000,                 │
│   txHash: "0xabc123..."                  │
│ }                                        │
│                                          │
│ Webhook call:                            │
│ POST /api/v1/deposit/ack                 │
│ {                                        │
│   user: "grace_addr",                    │
│   amount: "108200000",                   │
│   txHash: "0xabc123...",                 │
│   status: "confirmed"                    │
│ }                                        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Backend: Log & Trigger allocation        │ (Pedro)
│ 1. Ledger: add deposit record            │
│ 2. Emit: deposit.confirmed → queue       │
│ 3. AI policy: check allocation rules     │
│ 4. Decision: 80% yield, 20% buffer      │
│ 5. Execute allocation                    │
└──────────┬───────────────────────────────┘
           │
           ├─────────────────┬─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
    │ Allocate    │  │ Update       │  │ Generate    │
    │ 86.56 USDC  │  │ Frontend UI  │  │ Reasoning   │
    │ to yield    │  │              │  │ log         │
    │ pool        │  │ Balance:     │  │             │
    │             │  │ $108.20      │  │ "Allocated  │
    │ TX emits    │  │ Yield: $0.01 │  │ 80% to      │
    │ YieldAlloc. │  │              │  │ safe yield" │
    │ event       │  │ Buffer: 20%  │  │             │
    └─────────────┘  └──────────────┘  └─────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                             ▼
                    ✅ Allocation Complete
                    Grace's money working!
```

---

## 4️⃣ EVENT FLOW: DETECTION TO RESPONSE

```
Arc Blockchain Event
│
├─ Event Type: Deposit
├─ User: 0xgrace...
├─ Amount: 108200000 (108.2 USDC)
├─ Block: 12345
├─ TX Hash: 0xabc123...
│
▼ (Arc RPC WebSocket)

Indexer Service (Your Code)
┌──────────────────────────────────────────┐
│ EventListener.on('Deposit', ...)         │
│                                          │
│ Step 1: Parse event                      │
│ {                                        │
│   user: "0xgrace...",                    │
│   amount: 108200000n,                    │
│   timestamp: 1699000000,                 │
│   blockNumber: 12345,                    │
│   transactionHash: "0xabc123..."        │
│ }                                        │
│                                          │
│ Step 2: Log to file                      │
│ "2024-10-28 12:00:00 [INFO] 📥 Deposit │
│  event detected: grace, 108.2 USDC"    │
│                                          │
│ Step 3: Call EventProcessor              │
│ await processDeposit(event)              │
│                                          │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ EventProcessor.processDeposit()          │
│                                          │
│ POST /api/v1/deposit/ack                 │
│ {                                        │
│   user: "0xgrace...",                    │
│   amount: "108200000",                   │
│   txHash: "0xabc123...",                 │
│   blockNumber: 12345,                    │
│   timestamp: "2024-10-28T12:00:00Z",    │
│   status: "confirmed"                    │
│ }                                        │
│                                          │
│ Retry logic (if failed):                 │
│ • Exponential backoff                    │
│ • Max 3 retries                          │
│ • Alert if all fail                      │
│                                          │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Backend API: /api/v1/deposit/ack         │ (Pedro)
│                                          │
│ 1. Verify signature                      │
│ 2. Check idempotency (no double-count)  │
│ 3. Log deposit to Postgres               │
│ 4. Update user ledger                    │
│ 5. Trigger allocation policy             │
│ 6. Emit event: deposit.confirmed         │
│ 7. Return 200 OK                         │
│                                          │
└──────────┬───────────────────────────────┘
           │
           ├─────────────────┬──────────────┐
           │                 │              │
           ▼                 ▼              ▼
    ┌────────────────┐ ┌──────────────┐ ┌────────────┐
    │ Database       │ │ Message Queue│ │ Monitoring │
    │ (Postgres)     │ │ (Redis)      │ │ (Prometheus)
    │                │ │              │ │            │
    │ Deposit row:   │ │ deposit.conf │ │ deposit_   │
    │ id: 1234       │ │ irmed queue: │ │ counter++  │
    │ user: grace    │ │ • Allocate   │ │            │
    │ amount: 108.2  │ │ • Yield calc │ │ dep_lat    │
    │ status: done   │ │ • Notify     │ │ = 5.2s     │
    │                │ │              │ │            │
    └────────────────┘ └──────────────┘ └────────────┘
           │                 │                │
           └─────────────────┼────────────────┘
                             │
                             ▼
                    Event Processing Complete ✅
```

---

## 5️⃣ COMPONENT INTERACTION DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            YOUR COMPONENTS                               │
└─────────────────────────────────────────────────────────────────────────┘

Frontend (Next.js + React)
┌────────────────────────────────────────┐
│ VoiceInterface.tsx                     │
│ ├─ Capture audio (Web Audio API)       │
│ ├─ Send to Workers AI (STT)            │
│ ├─ Submit intent to backend            │
│ ├─ Receive response                    │
│ └─ Play via ElevenLabs TTS             │
│                                         │
│ BalanceDisplay.tsx                     │
│ ├─ Fetch balance from useVault hook   │
│ ├─ Display USDC + yield                │
│ ├─ Auto-refresh every 10s              │
│ └─ Update on events                    │
│                                         │
│ useWallet.ts (Hook)                    │
│ ├─ Connect to Metamask/Circle          │
│ ├─ Switch networks                     │
│ ├─ Get account address                 │
│ └─ Manage provider/signer              │
│                                         │
│ useVault.ts (Hook)                     │
│ ├─ Call AilaVault contract             │
│ ├─ Fetch user balance                  │
│ ├─ Execute deposit()                   │
│ ├─ Execute withdraw()                  │
│ └─ Listen for events                   │
│                                         │
└────────────────────────────────────────┘
         │                         │
         │ ethers.js              │ Event
         │ Contract calls         │ Subscription
         │                         │
         └──────────┬──────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Arc Blockchain       │
         │ (Smart Contracts)    │
         │                      │
         │ AilaVault            │
         │ LiquidityBuffer      │
         │ YieldAllocator       │
         └──────────┬───────────┘
                    │
                    │ Events
                    │
                    ▼
         ┌──────────────────────────────┐
         │ Event Indexer (Your code)    │
         │ indexer/src/index.ts         │
         │                              │
         │ • Listen to Arc RPC          │
         │ • Detect events              │
         │ • Process events             │
         │ • Send webhooks              │
         │ • Log transactions           │
         │ • Reconcile balances         │
         │                              │
         └──────────┬───────────────────┘
                    │
                    │ Webhook
                    │ HTTP POST
                    │
                    ▼
         ┌──────────────────────────────┐
         │ Backend API (Pedro)          │
         │ /api/v1/deposit/ack          │
         │ /api/v1/withdraw/ack         │
         │ /api/v1/intent               │
         │                              │
         │ • Verify events              │
         │ • Update ledger              │
         │ • Run policies               │
         │ • Send notifications         │
         │                              │
         └──────────────────────────────┘
```

---

## 6️⃣ GRACE SCENARIO — COMPLETE TIMELINE

```
Time    Action                          Component           Status
────    ──────────                      ─────────           ──────
12:00   Grace opens AilaBank            Frontend            ✅ Online
12:01   Connects Metamask               useWallet hook      ✅ Connected
12:02   Dashboard loads                 BalanceDisplay      ✅ $0.00
12:03   Says: "Deposit 100 euros"      VoiceInterface      ✅ Listening
12:04   STT converts to text            Workers AI          ✅ "Deposit 100 euros"
12:05   Backend processes intent        Backend API         ✅ Parsing
12:06   FX conversion: 100 EUR → 108.2  FX Service          ✅ Approved
12:07   Deposit TX submitted            AilaVault contract  ⏳ Pending
12:08   TX confirmed                    Arc blockchain      ✅ Confirmed
12:09   Event emitted                   AilaVault contract  ✅ Deposit event
12:10   Indexer detects event           Event Listener      ✅ Detected
12:11   Webhook sent to backend         EventProcessor      ✅ Acked
12:12   Auto-allocation triggered       Yield Allocator     ✅ 80/20 split
12:13   Aila responds via TTS           ElevenLabs          ✅ "Your 100 euros..."
12:14   Grace sees: $108.20             Frontend UI         ✅ Balance updated
        │
        │ [Time passes: 24 hours]
        │
12:14   Grace's yield accrues           YieldAllocator      ✅ +$0.01
+24h    Daily check: $108.21            Frontend UI         ✅ Updated
        │
        │ [Grace needs cash]
        │
12:15   Says: "Withdraw 20 dollars"    VoiceInterface      ✅ Listening
+24h
12:16   Backend checks buffer           LiquidityBuffer     ✅ 21.64 available
12:17   Withdrawal TX submitted         LiquidityBuffer     ⏳ Pending
12:18   TX confirmed                    Arc blockchain      ✅ Confirmed
12:19   Event emitted                   LiquidityBuffer     ✅ Withdraw event
12:20   Indexer detects                 Event Listener      ✅ Detected
12:21   Off-ramp to M-Pesa              Circle Gateway      ✅ Sent
12:22   Aila responds                   ElevenLabs          ✅ "20 sent to M-Pesa"
12:23   Grace receives $20              M-Pesa notification ✅ Received!
+24h
        │
        │ Grace's money:
        │ • Protected: $88.21 (secured in USDC vault)
        │ • Earning: 5% APY (~$0.01/day)
        │ • Accessible: Instant via M-Pesa
        │ • Auditable: Every transaction on Arc
        │ • Transparent: Knows why each move happens
        │
        ✅ AILA BANK MISSION ACCOMPLISHED
```

---

## 7️⃣ DEPLOYMENT ARCHITECTURE

```
LOCAL DEVELOPMENT
┌──────────────────────┐
│ Your Computer        │
├──────────────────────┤
│ • Hardhat (local)    │
│ • npm run dev        │
│ • localhost:3000     │
│ • Testnet RPC        │
└──────────────────────┘

                ↓ Commit to GitHub

STAGING/TESTNET
┌──────────────────────┐
│ Arc Testnet          │
├──────────────────────┤
│ • Contracts live     │
│ • Testnet USDC       │
│ • Real events        │
│ • indexer running    │
└──────────────────────┘

                ↓ Verified & Tested

PRODUCTION (Phase 4)
┌──────────────────────┐
│ Arc Mainnet          │
├──────────────────────┤
│ • Real USDC          │
│ • Real users         │
│ • Security audits    │
│ • Premium support    │
└──────────────────────┘
```

---

This visual reference should help you understand the complete system architecture and data flows! 🎯

*Generated for AilaBank MVP Build, Oct 2025*
