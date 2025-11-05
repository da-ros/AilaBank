# 🎯 AilaBank — Hackathon Resource Alignment & Execution Roadmap

**Hackathon**: AI Agents on Arc with USDC  
**Timeline**: Oct 27 – Nov 9, 2025 (10 days to submission)  
**Owner**: Ramspheld (Smart Contracts + Frontend Web3 + Event Listener)  
**Submission Deadline**: Nov 8, 11:59 PM (Online Phase)  

---

## 📋 SECTION 1: RESOURCE INVENTORY & ALLOCATION

### 🔵 Updated Divergent Factors (to outcompete)
- Create/Raise: best‑rate guarantee, RateSweep automation, in‑flight yield, instant liquidity, proof‑of‑best‑execution, voice UX, corridor‑aware routing, public reliability/cost dashboard
- Eliminate/Reduce: card MDR dependence, hidden FX, lockups, manual money moves, glam marketing (optimize for trust/metrics)

### 📊 MVP KPIs
- All‑in cost on $200 < 3%
- Median delivery < 5 min
- % idle cash auto‑swept (target > 70%)
- Merchant “effective MDR” after yield ≤ 0.3%

### **Blockchain Infrastructure** ✅
| Resource | Purpose in AilaBank | Allocation |
|----------|-------------------|-----------|
| **Arc (EVM L1)** | Deploy AilaVault, LiquidityBuffer, YieldAllocator contracts | Primary deployment target |
| **USDC** | Native gas + primary asset in vault (no ETH/native chain token) | All balances stored as USDC |
| **Arc Testnet RPC** | Local & testnet contract interactions | Dev/test environment |
| **USDC Faucet** | Mint testnet USDC for testing flows | Testing & demo |

**Ramspheld's Action**: Deploy contracts to Arc testnet; use USDC faucet for demo transactions.

---

### **Account Abstraction & Wallet Infrastructure** ✅
| Resource | Purpose in AilaBank | Allocation |
|----------|-------------------|-----------|
| **Circle Wallets** | Create in-app wallets for users; manage USDC custody; handle off-ramps | Backend: Pedro integrates; Frontend: you display |
| **Crossmint** | Alternative wallet option (optional backup) | Backup if Circle integration delayed |
| **Dynamic** | SMS/email/social onboarding (accessibility) | Nice-to-have for MVP |
| **Thirdweb** | Account abstraction, user authentication | Frontend wallet connection |
| **Para** | One-wallet ecosystem identity (future) | Post-MVP consideration |

**Ramspheld's Action**: 
- Build `WalletConnect` component using ethers.js + Thirdweb or native Metamask
- Integrate Circle wallet display in frontend (backend: Pedro handles API)
- Test wallet connection to Arc testnet contracts

---

### **Cross-Chain & Liquidity Movement** ✅
| Resource | Purpose in AilaBank | Allocation |
|----------|-------------------|-----------|
| **CCTP V2** | Cross-chain USDC transfers (future multi-chain expansion) | Phase 2+, not MVP |
| **Bridge Kit SDK** | Simplified cross-chain USDC routing | Phase 2+, demo simulation for now |
| **Circle Gateway** | Unified USDC balance across chains (future) | Post-MVP |
| **Pimlico** | Smart account management & paymaster | Optional: account abstraction enhancement |

**Ramspheld's Action**: 
- Implement Bridge Kit stub in backend orchestrator (Pedro)
- For MVP: simulate cross-chain routing (no real CCTP execution)
- Plan Phase 2 integration

---

### **AI & Voice Technologies** ✅
| Resource | Purpose in AilaBank | Allocation |
|----------|-------------------|-----------|
| **ElevenLabs** | TTS (Text-to-Speech) for voice responses; localized voices | **CRITICAL for MVP** |
| **Cloudflare Workers AI** | Edge-based STT (Speech-to-Text), intent parsing, LLM reasoning | **CRITICAL for MVP** |
| **AI/ML API** | Advanced reasoning models, fallback for Workers AI if needed | Backup + complex decisions |

**Ramspheld's Action**: 
- Build `VoiceInterface.tsx` component
- Integrate ElevenLabs for TTS (respond to user actions)
- Coordinate with Pedro on Cloudflare Workers AI for STT
- Test voice → intent → contract flow

---

### **Developer Resources & Frameworks** ✅
| Resource | Purpose in AilaBank | Allocation |
|----------|-------------------|-----------|
| **Circle Sample Apps** | Reference implementation patterns | Learning resource |
| **Arc Deploy Tutorial** | Smart contract deployment guide | Reference for deployment |
| **Workers AI Quickstart** | Edge AI inference setup | Reference for Pedro |
| **Hardhat** | Contract testing & local deployment | **Your primary tool** |

**Ramspheld's Action**: 
- Use Arc Deploy Tutorial for testnet deployment
- Reference Circle Sample Apps for wallet patterns
- Set up Hardhat for contract development

---

### **Credits & Promotions** 🎁
| Resource | Value | Allocation |
|----------|-------|-----------|
| **ElevenLabs Coupon** | 3 months Creator Plan free | Apply for voice testing |
| **Cloudflare Workers AI** | Free tier (generous usage) | Use for edge inference |
| **AI/ML API Promo** | ARCHACK20 = $20 free credits | Use for advanced models |

**Ramspheld's Action**: Claim all coupons early (limited availability).

---

## 🏗️ SECTION 2: EXECUTION ROADMAP — Resource-Integrated

### **PHASE 0: Setup & Foundation (Days 1–2, Oct 28–29)**

**Goal**: Bootstrap project, claim resources, set up dev environment.

#### Tasks
- [ ] **Create GitHub repo** with proper structure:
  ```
  aila/
  ├── contracts/          (Hardhat project)
  ├── indexer/            (Event listener)
  ├── frontend/           (Next.js)
  ├── backend/            (Node.js, Pedro leads)
  ├── docs/
  └── README.md
  ```

- [ ] **Claim hackathon resources**:
  - [ ] ElevenLabs coupon (limited 500) → claim immediately
  - [ ] AI/ML API promo code ARCHACK20
  - [ ] Circle dev account (if not already)
  - [ ] Arc testnet RPC endpoint
  - [ ] USDC testnet faucet access

- [ ] **Set up development environment**:
  ```bash
  # Smart Contracts
  npm init -y && npm install hardhat ethers @openzeppelin/contracts
  
  # Frontend
  npx create-next-app@latest aila-frontend
  npm install ethers viem @thirdweb-dev/react
  
  # Indexer
  npm init -y && npm install ethers redis dotenv
  ```

- [ ] **Configure environment files**:
  - `.env.example` with Arc RPC, private keys (testnet), contract addresses
  - ElevenLabs API key setup
  - Circle API credentials (for Pedro)

**Resources Used**: Arc RPC, GitHub, npm packages

---

### **PHASE 1A: Smart Contracts (Days 2–4, Oct 29–31)**

**Goal**: Implement core contracts using Solidity best practices; deploy to Arc testnet.

#### Deliverables

**1. AilaVault.sol** (User balance vault)
```
✓ Deposit/withdraw logic
✓ Yield accumulation tracking
✓ Event emission for indexer
✓ Access control (admin pause)
```

**2. LiquidityBuffer.sol** (Instant withdrawal pool)
```
✓ 10–20% liquidity buffer
✓ Auto-refill trigger
✓ Buffer health checks
```

**3. YieldAllocator.sol** (Yield deployment stub)
```
✓ Mock allocation to pools
✓ Harvest yield simulation
✓ Rebalance stubs (for Phase 2)
```

#### Implementation Details

**Tools Used**:
- **Hardhat**: Compile, test, deploy
- **OpenZeppelin**: AccessControl, Pausable, ReentrancyGuard
- **Arc RPC**: Deploy to testnet
- **Ethers.js**: Contract interaction library

**Testing**:
```bash
npx hardhat test

# Expected results:
# AilaVault.test.sol
#   ✓ deposit() records balance
#   ✓ withdraw() transfers USDC
#   ✓ yield accumulation works
#   ✓ pause/unpause controls work

# LiquidityBuffer.test.sol
#   ✓ buffer maintains 10-20%
#   ✓ instant withdrawals succeed
#   ✓ auto-refill triggers

# Integration tests
#   ✓ Full deposit → allocate → withdraw flow
```

**Deployment**:
```bash
# 1. Set PRIVATE_KEY in .env (testnet key)
# 2. npx hardhat run scripts/deploy.ts --network arc_testnet
# 3. Export ABIs to frontend/public/abis/
```

**Output**:
- ✅ 3 contracts deployed to Arc testnet
- ✅ ABIs exported: `AilaVault.json`, `LiquidityBuffer.json`, `YieldAllocator.json`
- ✅ Contract addresses saved in `constants.ts`

**Resources Used**: 
- Arc testnet + RPC
- Hardhat + OpenZeppelin
- USDC testnet faucet (for test transactions)

---

### **PHASE 1B: Event Listener & Indexer (Days 3–4, Oct 30–31)**

**Goal**: Build service that listens to on-chain events and syncs to backend.

#### Implementation

**File: `indexer/src/index.ts`**
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
const vaultABI = require('../abi/AilaVault.json');
const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultABI, provider);

// Listen for Deposit events
vaultContract.on('Deposit', async (user, amount, timestamp, event) => {
  console.log(`📥 Deposit: ${user} deposited ${amount}`);
  
  // Send to backend
  await fetch('http://localhost:3000/api/v1/deposit/ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user,
      amount,
      txHash: event.transactionHash,
      timestamp: new Date().toISOString()
    })
  });
});

// Listen for Withdraw events
vaultContract.on('Withdraw', async (user, amount, toAddress, timestamp, event) => {
  console.log(`📤 Withdraw: ${user} withdrew ${amount} to ${toAddress}`);
  
  await fetch('http://localhost:3000/api/v1/withdraw/ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user,
      amount,
      toAddress,
      txHash: event.transactionHash,
      timestamp: new Date().toISOString()
    })
  });
});

// Daily reconciliation
setInterval(async () => {
  console.log('🔄 Running nightly reconciliation...');
  // Compare contract state with backend ledger
}, 24 * 60 * 60 * 1000);

provider.on('block', (blockNumber) => {
  console.log(`✅ Arc Block ${blockNumber}`);
});
```

**Output**:
- ✅ Event listener running and logging Arc events
- ✅ Webhook calls to backend for deposit/withdraw
- ✅ Reconciliation logic ready

**Resources Used**: 
- Arc RPC (event subscription)
- Ethers.js (event listening)
- Redis (optional: caching)

---

### **PHASE 2: AI Intent & Voice Layer (Days 4–6, Oct 31–Nov 2)**

**Goal**: Integrate Cloudflare Workers AI + ElevenLabs for voice-first UX.

#### Key Components

**A. Cloudflare Workers AI Endpoint (Edge STT)**

**Setup**:
1. Create Cloudflare Worker script (`indexer/workers/intent-parser.ts`)
2. Deploy to Cloudflare Workers
3. Use Whisper Large v3 Turbo for STT (speech-to-text)

**File: `indexer/workers/intent-parser.ts`**
```typescript
import { Ai } from '@cloudflare/ai';

export default {
  async fetch(request: Request, env: any) {
    const ai = new Ai(env.AI);
    
    // Handle speech → text
    if (request.headers.get('content-type') === 'audio/wav') {
      const buffer = await request.arrayBuffer();
      
      const response = await ai.run('@cf/openai/whisper-large-v3-turbo', {
        audio: Array.from(new Uint8Array(buffer))
      });
      
      return new Response(JSON.stringify({
        text: response.result.text,
        confidence: response.result.confidence
      }));
    }
    
    return new Response('Invalid request', { status: 400 });
  }
};
```

**Deployment**:
```bash
cd indexer/workers
wrangler publish
# Returns: https://aila-intent.your-account.workers.dev
```

**B. Intent Parsing (Backend: Pedro's responsibility)**

Your frontend will send audio to the Workers endpoint, receive text, then send to Pedro's backend `/api/v1/intent`.

**C. ElevenLabs TTS Integration (Your Frontend)**

**File: `frontend/src/components/VoiceInterface.tsx`**
```typescript
import axios from 'axios';
import { useEffect, useRef } from 'react';

export const VoiceInterface = ({ onIntentSubmit }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Speech-to-Text via Cloudflare Workers AI
  const startListening = async () => {
    setIsListening(true);
    
    try {
      // Use Web Audio API to capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.onDataAvailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        
        // Send to Cloudflare Workers for STT
        const sttResponse = await axios.post(
          'https://aila-intent.your-account.workers.dev',
          audioBlob,
          { headers: { 'content-type': 'audio/wav' } }
        );
        
        setTranscript(sttResponse.data.text);
        
        // Send intent to backend (Pedro's API)
        const intentResponse = await axios.post(
          'http://localhost:3000/api/v1/intent',
          {
            raw_text: sttResponse.data.text,
            user_id: currentUser.id,
            confidence: sttResponse.data.confidence
          }
        );
        
        setAiResponse(intentResponse.data.explanation);
        
        // Text-to-Speech via ElevenLabs
        const ttsResponse = await axios.post(
          'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
          {
            text: intentResponse.data.explanation,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          },
          {
            headers: { 'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_KEY }
          }
        );
        
        // Play audio response
        const audio = new Audio(ttsResponse.data.audio_url);
        audio.play();
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // 5-sec recording
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="voice-interface">
      <button 
        onClick={startListening} 
        disabled={isListening}
        className="mic-button"
      >
        {isListening ? '🎤 Listening...' : '🎤 Speak'}
      </button>
      
      {transcript && (
        <div className="transcript">
          <p><strong>You said:</strong> {transcript}</p>
        </div>
      )}
      
      {aiResponse && (
        <div className="ai-response">
          <p><strong>Aila:</strong> {aiResponse}</p>
          <audio ref={audioRef} autoPlay />
        </div>
      )}
    </div>
  );
};
```

**Output**:
- ✅ Voice capture via Web Audio API
- ✅ STT via Cloudflare Workers AI
- ✅ Intent parsing (backend)
- ✅ TTS response via ElevenLabs
- ✅ Full voice loop working

**Resources Used**: 
- Cloudflare Workers AI (STT)
- ElevenLabs (TTS)
- Web Audio API (browser)

---

### **PHASE 3: Web3 Frontend Integration (Days 5–7, Nov 1–3)**

**Goal**: Build frontend components to interact with Arc contracts and display real-time data.

#### Components & Hooks

**File: `frontend/src/hooks/useWallet.ts`**
```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const checkConnection = async () => {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            const provider = new ethers.BrowserProvider(window.ethereum);
            setProvider(provider);
            setSigner(await provider.getSigner());
          }
        } catch (error) {
          console.error('Wallet check failed:', error);
        }
      };
      checkConnection();
    }
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
      setSigner(await provider.getSigner());
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const switchToArcTestnet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x...' }] // Arc testnet chain ID
      });
    } catch (error) {
      console.error('Chain switch failed:', error);
    }
  };

  return { account, provider, signer, connectWallet, switchToArcTestnet };
};
```

**File: `frontend/src/hooks/useVault.ts`**
```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { VAULT_ADDRESS, VAULT_ABI } from '@/utils/contracts';

export const useVault = (provider: ethers.BrowserProvider | null) => {
  const [balance, setBalance] = useState<bigint>(0n);
  const [yieldAccrued, setYieldAccrued] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
        const userAccount = await provider.getSigner().getAddress();
        
        const bal = await contract.getBalance(userAccount);
        const yield_amt = await contract.userYield(userAccount);
        
        setBalance(bal);
        setYieldAccrued(yield_amt);
      } catch (error) {
        console.error('Error fetching balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    
    // Re-fetch every 5 seconds
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [provider]);

  const deposit = async (signer: ethers.Signer, amount: bigint) => {
    setLoading(true);
    try {
      const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      const tx = await contract.deposit(amount);
      const receipt = await tx.wait();
      
      console.log('Deposit successful:', receipt?.hash);
      return receipt;
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (signer: ethers.Signer, amount: bigint) => {
    setLoading(true);
    try {
      const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      const tx = await contract.withdraw(amount);
      const receipt = await tx.wait();
      
      console.log('Withdrawal successful:', receipt?.hash);
      return receipt;
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { balance, yieldAccrued, loading, deposit, withdraw };
};
```

**File: `frontend/src/components/BalanceDisplay.tsx`**
```typescript
import { useWallet } from '@/hooks/useWallet';
import { useVault } from '@/hooks/useVault';
import { ethers } from 'ethers';

export const BalanceDisplay = () => {
  const { account, provider } = useWallet();
  const { balance, yieldAccrued, loading } = useVault(provider);

  if (!account) {
    return <div>Wallet not connected</div>;
  }

  const balanceUSDC = ethers.formatUnits(balance, 6);
  const yieldUSDC = ethers.formatUnits(yieldAccrued, 6);

  return (
    <div className="balance-display">
      <div className="stat">
        <label>Total Balance (USDC)</label>
        <h2>${loading ? '...' : balanceUSDC}</h2>
      </div>
      <div className="stat">
        <label>Accrued Yield</label>
        <p className="yield">${loading ? '...' : yieldUSDC}</p>
      </div>
      <div className="stat">
        <label>Connected Wallet</label>
        <p className="address">{account}</p>
      </div>
    </div>
  );
};
```

**Output**:
- ✅ Wallet connection & switching networks
- ✅ Real-time balance & yield display
- ✅ Deposit/withdraw UI ready
- ✅ Contract interaction via ethers.js

**Resources Used**: 
- Ethers.js + Web3.js
- Arc testnet provider
- React hooks

---

### **PHASE 4: Integration & End-to-End Testing (Days 7–9, Nov 3–5)**

**Goal**: Wire all components together; test full "Grace" scenario.

#### Grace Scenario Test Flow

**Scenario**: "Grace deposits 100 EUR, AI allocates it, she withdraws 20 USD to local account"

**Flow**:
```
1. User connects wallet
   → VoiceInterface listens for: "Deposit 100 EUR"
   → Cloudflare Workers STT converts speech to text
   
2. Text sent to Backend (/api/v1/intent)
   → Backend (Pedro): parse intent → "deposit 100 EUR"
   → Call FX service: EUR → USDC conversion (~108 USDC)
   → Approve Circle wallet to receive USDC
   
3. Backend calls Arc contract: deposit(108e6)
   → AilaVault stores user balance = 108 USDC
   → Emits Deposit event
   
4. Event Listener catches event
   → Pushes to backend reconciliation
   → Frontend balance updates (real-time)
   
5. ElevenLabs TTS: "Converted 100 EUR to 108.2 USDC. Allocating to vault..."
   
6. AI triggers auto-allocate: 80% to yield, 20% to buffer
   → YieldAllocator processes allocation
   
7. User: "Withdraw 20 USD"
   → Backend converts USD → USDC (assuming ~20 USDC)
   → Checks LiquidityBuffer (has 21.6 = 20% of 108)
   → Executes withdrawal from buffer
   → Sends via Circle off-ramp to local bank
   
8. ElevenLabs TTS: "Withdrew 20 USDC. Sent to M-Pesa..."
   
✅ Full flow complete
```

#### Test Implementation

**File: `frontend/src/__tests__/graceScenario.test.ts`**
```typescript
import { ethers } from 'ethers';
import { testFunctions } from '@/utils/testHelpers';

describe('Grace Scenario - Deposit EUR → Allocate → Withdraw USD', () => {
  let vaultContract, bufferContract, provider, signer;

  beforeAll(async () => {
    provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    signer = await provider.getSigner();
    vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    bufferContract = new ethers.Contract(BUFFER_ADDRESS, BUFFER_ABI, signer);
  });

  it('should deposit 108 USDC (EUR conversion)', async () => {
    const tx = await vaultContract.deposit(ethers.parseUnits('108', 6));
    const receipt = await tx.wait();
    expect(receipt?.status).toBe(1);
    
    const balance = await vaultContract.getBalance(await signer.getAddress());
    expect(balance).toBe(ethers.parseUnits('108', 6));
  });

  it('should allocate 80% to yield, 20% to buffer', async () => {
    // Trigger allocation (or manually call allocator)
    const allocatorTx = await testFunctions.allocateVault(
      vaultContract,
      ethers.parseUnits('108', 6),
      80, // 80% to yield
      20  // 20% to buffer
    );
    expect(allocatorTx).toBeDefined();
  });

  it('should withdraw 20 USDC from buffer (instant)', async () => {
    const beforeBal = await vaultContract.getBalance(await signer.getAddress());
    
    const withdrawTx = await bufferContract.withdraw(
      ethers.parseUnits('20', 6),
      await signer.getAddress()
    );
    const receipt = await withdrawTx.wait();
    expect(receipt?.status).toBe(1);
    
    const afterBal = await vaultContract.getBalance(await signer.getAddress());
    expect(afterBal).toBe(beforeBal - ethers.parseUnits('20', 6));
  });

  it('should emit and listen to Deposit event', async () => {
    let eventEmitted = false;
    
    vaultContract.on('Deposit', (user, amount) => {
      eventEmitted = true;
      expect(user).toBe(await signer.getAddress());
    });
    
    await vaultContract.deposit(ethers.parseUnits('50', 6));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(eventEmitted).toBe(true);
  });

  it('should verify yield accumulation', async () => {
    const yieldBefore = await vaultContract.userYield(await signer.getAddress());
    
    // Simulate yield accrual (or wait for actual yield)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const yieldAfter = await vaultContract.userYield(await signer.getAddress());
    expect(yieldAfter).toBeGreaterThanOrEqual(yieldBefore);
  });
});
```

**Run tests**:
```bash
npm test

# Expected output:
# ✅ Grace Scenario - Deposit EUR → Allocate → Withdraw USD
#   ✅ should deposit 108 USDC (EUR conversion)
#   ✅ should allocate 80% to yield, 20% to buffer
#   ✅ should withdraw 20 USDC from buffer (instant)
#   ✅ should emit and listen to Deposit event
#   ✅ should verify yield accumulation
#
# All tests passed ✅
```

**Output**:
- ✅ Full end-to-end flow tested
- ✅ Voice → Intent → Contract → UI update verified
- ✅ Event listening working
- ✅ Grace scenario passes all checks

---

### **PHASE 5: Security Review & Optimization (Days 8–9, Nov 4–5)**

**Goal**: Run security audits; optimize gas & UX.

#### Security Checks

**1. Slither (Static Analysis)**
```bash
pip install slither-analyzer
slither contracts/src/AilaVault.sol

# Expected: No HIGH/MEDIUM issues
```

**2. Mythx (Formal Verification)**
```bash
npm install -g @mythx/cli
mythx analyze contracts/src/AilaVault.sol

# Expected: Safe for testnet deployment
```

**3. Manual Review Checklist**
- [ ] Reentrancy protection on withdrawals
- [ ] Integer overflow/underflow (use SafeMath or Solidity 0.8+)
- [ ] Access control (onlyAdmin, onlyVault)
- [ ] Event logging (all state changes)
- [ ] Emergency pause working
- [ ] Circuit breaker logic in place

#### Optimization

**Gas Optimization**:
- Use batch operations for multiple deposits
- Cache frequently read state variables
- Optimize event emission (log only essential data)

**UX Optimization**:
- Real-time balance refresh (every 5s)
- Loading states for transactions
- Error boundaries for failed operations
- Friendly error messages

**Output**:
- ✅ Contracts pass Slither & MythX
- ✅ Gas usage optimized
- ✅ UX polished

---

### **PHASE 6: Demo & Submission Preparation (Days 9–10, Nov 5–8)**

**Goal**: Record demo video, prepare submission assets.

#### Demo Script (60–120 seconds)

**Narrative**: "Meet Grace, a freelancer in Nairobi earning in euros but saving in US dollars."

**Demo Flow**:
```
[0–10s] Scene: Dashboard with empty account
  Narration: "Grace earns €100 from a client, but currency volatility 
             worries her. She uses AilaBank to protect her savings."

[10–20s] Voice command: "Deposit 100 euros"
  Visual: Microphone animation → spinning loader
  Aila responds: "Converting 100 EUR to 108.2 USDC..."
  Visual: Balance updates to $108.2 USDC

[20–35s] Auto-allocation
  Narration: "Aila intelligently allocates 80% to yield, keeping 20% 
             instantly available."
  Visual: Pie chart shows allocation (80% green yield, 20% blue buffer)
  Yield starts accruing: +$0.05/hour displayed

[35–50s] Withdrawal request: "Withdraw $20 to my M-Pesa"
  Visual: Confirmation screen, instant processing
  Aila: "Sending $20 USDC to your M-Pesa. Processing..."
  Visual: Success toast, transaction hash link

[50–60s] Impact
  Narration: "Grace earned $0.32 in yield today while keeping access 
             to her money. No bank fees. No currency loss."
  Visual: Monthly projection: $9.60 in yield earned
  Logo + tagline: "AilaBank: Invisible Crypto. Real Banking."

[60s+] Call-to-action
  "Built for AI Agents on Arc with USDC. Powered by Circle, Cloudflare, 
   ElevenLabs, and AI/ML API."
```

#### Submission Checklist

- [ ] **Cover Image**: Screenshot of dashboard with $108.2 balance
- [ ] **Video Presentation**: 60–120s demo (uploaded to YouTube/Loom)
- [ ] **Slide Presentation**: 6–8 slides
  1. Problem (currency volatility in emerging markets)
  2. Solution (AI-native stablebank)
  3. Core Features (voice UX, auto-yield, instant liquidity)
  4. Demo (video or GIF)
  5. Business Model (yield share, fees)
  6. Roadmap (Phase 1–4)
  7. Team & Tech Stack
  8. Call-to-action

- [ ] **GitHub Repository**
  - Clean, documented code
  - README with architecture diagram
  - Deployment instructions
  - Smart contract ABIs exported
  - License: MIT

- [ ] **Demo Application URL**
  - Live testnet frontend
  - Connected to Arc contracts
  - Functional voice interface
  - Real-time balance display

- [ ] **Submission Form** (lablab.ai)
  - Project title: "AilaBank: AI-Native Stablecoin Banking"
  - Description: 2–3 paragraphs
  - Technology tags: AI, Web3, Voice, Payments, USDC
  - Category: "On-Chain Actions" or "Payments for RWA"

**Output**:
- ✅ Professional demo video
- ✅ Polished presentation deck
- ✅ Public GitHub repo
- ✅ Live frontend demo
- ✅ All submission assets ready

---

## 📊 SECTION 3: RESOURCE UTILIZATION MATRIX

| Component | Phase | Resource | Provider | Status |
|-----------|-------|----------|----------|--------|
| **Smart Contracts** | 1A | Hardhat, Solidity, Arc RPC | Ethereum Foundation, Arc | ✅ Use |
| **Testing** | 1A | Hardhat, Chai, Ethers.js | Ethereum Foundation | ✅ Use |
| **Event Indexing** | 1B | Arc RPC, Ethers.js | Arc | ✅ Use |
| **Edge AI (STT)** | 2 | Cloudflare Workers AI | Cloudflare | ✅ Use |
| **Voice Synthesis** | 2 | ElevenLabs API + Coupon | ElevenLabs | ✅ Use |
| **Advanced AI** | 2 | AI/ML API + ARCHACK20 | AI/ML API | ⚠️ Optional |
| **Wallet Connection** | 3 | Ethers.js, Thirdweb | Ethers Foundation, Thirdweb | ✅ Use |
| **Wallet Custody** | 3 | Circle Wallets SDK | Circle | ⚠️ Pedro leads |
| **Cross-chain** | Phase 2+ | CCTP V2, Bridge Kit | Circle | 📋 Stub for now |
| **Deployment** | 5 | Arc Testnet RPC | Arc | ✅ Use |
| **Monitoring** | 5–6 | Prometheus, Grafana | Open source | ✅ Use |

---

## 🎯 SECTION 4: RAMSPHELD'S DAILY CHECKLIST (Days 1–10)

### **Day 1 (Oct 28) — Setup & Resources**
- [ ] Claim ElevenLabs coupon (500 limit!)
- [ ] Claim AI/ML API promo (ARCHACK20)
- [ ] Get Circle dev account
- [ ] Get Arc testnet RPC
- [ ] Create GitHub org/repo
- [ ] Initialize Hardhat project
- [ ] Initialize Next.js frontend
- [ ] Set up `contracts/` and `frontend/` folder structure

### **Day 2–3 (Oct 29–30) — Smart Contracts**
- [ ] Write AilaVault.sol (deposit, withdraw, yield tracking)
- [ ] Write LiquidityBuffer.sol (10–20% buffer logic)
- [ ] Write YieldAllocator.sol (stub)
- [ ] Write unit tests for all 3 contracts
- [ ] Test locally with Hardhat

### **Day 4 (Oct 31) — Deployment & Events**
- [ ] Deploy contracts to Arc testnet
- [ ] Export ABIs to `frontend/public/abis/`
- [ ] Build event listener (`indexer/src/index.ts`)
- [ ] Test event listening on Arc RPC
- [ ] Document contract addresses in `constants.ts`

### **Day 5–6 (Nov 1–2) — Voice & AI Integration**
- [ ] Deploy Cloudflare Workers AI endpoint
- [ ] Build `VoiceInterface.tsx` component
- [ ] Integrate ElevenLabs TTS
- [ ] Test voice capture → STT → TTS flow
- [ ] Coordinate with Pedro on `/api/v1/intent` API

### **Day 7 (Nov 3) — Frontend Web3**
- [ ] Build `useWallet` hook (Metamask/Circle connection)
- [ ] Build `useVault` hook (contract interaction)
- [ ] Build `BalanceDisplay` component
- [ ] Build `WalletConnect` component
- [ ] Wire frontend to Arc contracts
- [ ] Test real-time balance updates

### **Day 8 (Nov 4) — Integration & Testing**
- [ ] Implement Grace scenario end-to-end test
- [ ] Test: voice → intent → contract → UI update
- [ ] Debug and fix any issues
- [ ] Run security scans (Slither, MythX)
- [ ] Optimize gas & UX

### **Day 9 (Nov 5) — Security & Demo Prep**
- [ ] Final security review
- [ ] Record demo video (60–120s)
- [ ] Prepare presentation deck (6–8 slides)
- [ ] Polish GitHub README
- [ ] Deploy frontend to live URL

### **Day 10 (Nov 8) — Final Submission**
- [ ] Verify all submission assets
- [ ] Final contract deployment (Arc testnet)
- [ ] Submit on lablab.ai before 11:59 PM
- [ ] Celebrate! 🎉

---

## 📚 SECTION 5: KEY RESOURCES & LINKS

### **Arc & USDC**
- Arc Testnet RPC: [https://testnet.arc.io/rpc](https://testnet.arc.io/rpc)
- USDC Testnet Faucet: [https://faucet.circle.com](https://faucet.circle.com)
- Arc Deploy Tutorial: [https://arc.io/docs/developers/deploy](https://arc.io/docs/developers/deploy)

### **Wallet & Smart Accounts**
- Circle Wallets SDK: [https://developers.circle.com/wallets](https://developers.circle.com/wallets)
- Thirdweb Wallets: [https://thirdweb.com/wallets](https://thirdweb.com/wallets)
- Ethers.js Docs: [https://docs.ethers.org/v6](https://docs.ethers.org/v6)

### **AI & Voice**
- Cloudflare Workers AI: [https://developers.cloudflare.com/workers-ai](https://developers.cloudflare.com/workers-ai)
- ElevenLabs API: [https://elevenlabs.io/docs/api-reference](https://elevenlabs.io/docs/api-reference)
- AI/ML API Docs: [https://docs.aimlapi.com](https://docs.aimlapi.com)

### **Development**
- Hardhat: [https://hardhat.org/docs](https://hardhat.org/docs)
- Next.js: [https://nextjs.org/docs](https://nextjs.org/docs)
- OpenZeppelin Contracts: [https://docs.openzeppelin.com/contracts](https://docs.openzeppelin.com/contracts)

### **Hackathon**
- lablab.ai Event: [https://lablab.ai/event/ai-agents-on-arc-with-usdc](https://lablab.ai/event/ai-agents-on-arc-with-usdc)
- Discord: [lablab.ai Discord](https://discord.gg/lablab)
- Submission: [https://lablab.ai/event/ai-agents-on-arc-with-usdc/submit](https://lablab.ai/event/ai-agents-on-arc-with-usdc/submit)

---

## 🏁 CONCLUSION

This roadmap aligns **every hackathon resource** to **AilaBank's core objectives**:

✅ **Arc + USDC** → Foundation (contracts + gas)  
✅ **Cloudflare Workers AI** → STT (edge inference)  
✅ **ElevenLabs** → TTS (voice responses)  
✅ **AI/ML API** → Advanced reasoning (optional)  
✅ **Circle Wallets** → Custody & off-ramps (backend)  
✅ **Hardhat** → Testing & deployment  
✅ **Next.js + Ethers.js** → Frontend Web3  
✅ **Event listeners** → Real-time sync  

**Timeline**: 10 days → MVP ready → Nov 8 submission → Nov 9 live pitching → 🏆 Prizes

Let's ship it! 🚀

---

*Generated for AilaBank Hackathon Build, Oct 2025*
