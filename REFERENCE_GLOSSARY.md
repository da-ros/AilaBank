# 📖 AilaBank — Glossary, Resources & Reference

**Quick lookup for all tools, concepts, and resources used in the hackathon build.**

---

## 🏛️ CONCEPTS & TERMINOLOGY

### Core Banking
| Term | Definition | AilaBank Use |
|------|-----------|--------------|
| **Stablecoin** | Cryptocurrency pegged to fiat (e.g., $1 USD) | USDC (primary asset) |
| **Vault** | Smart contract holding user funds | AilaVault.sol |
| **Liquidity Buffer** | Reserved funds for instant withdrawals | 10–20% of vault |
| **Yield** | Passive income from investments | Earned on idle USDC |
| **APY** | Annual Percentage Yield | 5% target return |
| **Principal** | Original deposited amount | User's main balance |

### Blockchain/Web3
| Term | Definition | AilaBank Use |
|------|-----------|--------------|
| **Smart Contract** | Self-executing code on blockchain | AilaVault, LiquidityBuffer |
| **Event** | On-chain action logged for indexing | Deposit, Withdraw, Yield |
| **Gas** | Transaction fee on blockchain | USDC (native gas on Arc) |
| **EVM** | Ethereum Virtual Machine (standard) | Arc is EVM-compatible |
| **Testnet** | Blockchain simulation (no real funds) | Arc testnet for MVP |
| **Chain ID** | Network identifier | Arc testnet: 91002 |
| **Signer** | Private key holder (you control account) | Ethers.js signer |
| **Provider** | Connection to blockchain RPC | Arc RPC endpoint |

### AI/Voice
| Term | Definition | AilaBank Use |
|------|-----------|--------------|
| **STT** | Speech-to-Text | Cloudflare Workers AI |
| **TTS** | Text-to-Speech | ElevenLabs |
| **Intent** | What user wants to do | "Deposit 100 EUR" |
| **Confidence** | ML model certainty (0–1) | Intent parsing accuracy |
| **NLU** | Natural Language Understanding | LLM parsing voice commands |
| **Agent** | Autonomous AI system | Aila (your assistant) |
| **Model** | Trained AI system | Whisper (STT), LLaMA (reasoning) |

### Development
| Term | Definition | AilaBank Use |
|------|-----------|--------------|
| **Frontend** | User-facing interface | Next.js dashboard |
| **Backend** | Server-side logic | Pedro's orchestrator |
| **Hook** | React reusable logic | useWallet, useVault |
| **Component** | UI building block | BalanceDisplay.tsx |
| **ABI** | Application Binary Interface | Contract function signatures |
| **Environment** | Configuration variables | .env files |
| **TypeScript** | JavaScript with type safety | Smart contracts & frontend |
| **Testnet** | Development network | Arc testnet for testing |

---

## 🔵 New Strategic Terms

| Term | Definition | AilaBank Use |
|------|------------|--------------|
| **RateSweep™** | AI engine that auto‑routes idle balances to the safest best‑rate yield within user policies | Core yield automation with instant buffer and de‑peg controls |
| **Best‑Rate Guarantee** | Commitment to route at the best available safe rate with full disclosure | Quote comparison and execution tracking per transfer |
| **Proof‑of‑Best‑Execution** | Verifiable receipt showing quotes, chosen route, FX, fees, spread | On‑chain hash anchor + off‑chain JSON receipt served by API |
| **Zero‑MDR via Yield‑Share** | Offsetting merchant discount rate using settlement micro‑yield before payout | Merchant acceptance flows and dashboards |
| **Travel‑Rule Payload** | Required sender/recipient data exchanged between VASPs for transfers | Embedded in corridor policies and backend routing |
| **Corridor Policy Pack** | Predefined compliance/routing rules for a payment corridor | Selectable per transfer; logged in receipts |


## 🛠️ TECHNOLOGY STACK

### Smart Contracts
```
Solidity 0.8.20
├── Framework: Hardhat
├── Libraries: OpenZeppelin (AccessControl, Pausable, ReentrancyGuard)
├── Testing: Chai + Ethers.js
├── Security: Slither, MythX
└── Deployment: Hardhat scripts
```

### Frontend
```
Next.js 14 (React framework)
├── Styling: Tailwind CSS
├── Web3: Ethers.js v6
├── State: React Hooks + Context
├── Hosting: Vercel/Netlify
└── Package Manager: npm
```

### Backend (Pedro)
```
Node.js / Python
├── Framework: Express/FastAPI
├── Web3: Ethers.js / Web3.py
├── Message Queue: Redis / Bull
├── Database: PostgreSQL
└── Hosting: Cloud Run / Railway
```

### Indexer (You)
```
Node.js
├── Event Listener: Ethers.js
├── Cache: Redis
├── Logging: Winston
├── Scheduling: Cron/Interval
└── Webhooks: Axios
```

### Blockchain
```
Arc (EVM Layer-1)
├── Network: Arc testnet
├── Chain ID: 91002
├── Native Gas: USDC
├── RPC: https://testnet.arc.io/rpc
└── Explorer: https://testnet.arc.io
```

### AI/Voice
```
Cloudflare Workers AI
├── Model: Whisper (STT)
├── Deployment: Edge (low latency)
├── Free Tier: Generous
└── Alternative: OpenAI Whisper API

ElevenLabs
├── Model: TTS (Text-to-Speech)
├── Coupon: 3 months free (Creator Plan)
├── Voices: 30+ multilingual
└── API: REST endpoint
```

---

## 📦 PACKAGES & DEPENDENCIES

### Contracts
```json
{
  "@nomicfoundation/hardhat-toolbox": "^3.0.0",
  "@openzeppelin/contracts": "^5.0.0",
  "hardhat": "^2.17.0",
  "ethers": "^6.7.1",
  "chai": "^4.3.7",
  "ts-node": "^10.9.1",
  "typescript": "^5.1.6"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "ethers": "^6.7.1",
  "axios": "^1.5.0",
  "tailwindcss": "^3.3.0",
  "typescript": "^5.1.6"
}
```

### Indexer
```json
{
  "ethers": "^6.7.1",
  "redis": "^4.6.7",
  "axios": "^1.5.0",
  "winston": "^3.10.0",
  "dotenv": "^16.3.1",
  "ts-node": "^10.9.1"
}
```

---

## 🔗 EXTERNAL RESOURCES & LINKS

### Official Documentation
| Resource | URL | Purpose |
|----------|-----|---------|
| Arc | https://arc.io | Blockchain mainpage |
| Arc Docs | https://arc.io/docs | Developer guide |
| Circle | https://developers.circle.com | USDC & wallet APIs |
| Hardhat | https://hardhat.org | Solidity dev framework |
| Ethers.js | https://docs.ethers.org/v6 | Web3 library |
| Next.js | https://nextjs.org | React framework |
| Cloudflare | https://developers.cloudflare.com/workers-ai | Edge AI inference |
| ElevenLabs | https://elevenlabs.io/docs | Voice synthesis API |

### Faucets & Testnet Tools
| Tool | URL | Purpose |
|------|-----|---------|
| USDC Faucet | https://faucet.circle.com | Get testnet USDC |
| Arc Explorer | https://testnet.arc.io | View transactions |
| Metamask | https://metamask.io | Wallet browser extension |
| Remix IDE | https://remix.ethereum.org | Contract IDE |

### Hackathon Resources
| Resource | URL | Purpose |
|----------|-----|---------|
| Hackathon Page | https://lablab.ai/event/ai-agents-on-arc-with-usdc | Official event page |
| Submission | https://lablab.ai/event/ai-agents-on-arc-with-usdc/submit | Submit your project |
| Discord | lablab.ai Discord | Community & support |
| Workshops | lablab.ai event page | Video tutorials |

---

## 🔐 SECURITY BEST PRACTICES

### Smart Contracts
- [ ] Use OpenZeppelin libraries (battle-tested)
- [ ] Implement ReentrancyGuard on external calls
- [ ] Validate all inputs
- [ ] Check permissions (AccessControl)
- [ ] Emit events for audit trail
- [ ] Run Slither & MythX scans
- [ ] Get external audit before mainnet

### Frontend
- [ ] Never expose private keys
- [ ] Use ethers.js signer (not raw keys)
- [ ] Validate user input
- [ ] HTTPS only
- [ ] Content Security Policy headers
- [ ] Sanitize displayed data

### Backend/Indexer
- [ ] Use environment variables for secrets
- [ ] Rotate API keys regularly
- [ ] Log & monitor all transactions
- [ ] Rate limit API endpoints
- [ ] Use HTTPS for webhooks
- [ ] Encrypt sensitive data at rest

### Deployment
- [ ] Never commit .env files
- [ ] Use AWS KMS / Cloudflare Secrets
- [ ] Separate dev/test/prod keys
- [ ] Enable 2FA on all accounts
- [ ] Regular backups

---

## 🎯 COMMON ISSUES & TROUBLESHOOTING

### Contract Deployment Issues
| Issue | Solution |
|-------|----------|
| "Compilation failed" | Check Solidity version in hardhat.config.ts |
| "Not enough gas" | Increase gasLimit in deployment script |
| "Private key invalid" | Verify .env PRIVATE_KEY format (0x prefix) |
| "Contract not found" | Verify deployed address in constants.ts |

### Frontend Issues
| Issue | Solution |
|-------|----------|
| "Metamask not detected" | Install MetaMask extension or use Circle wallets |
| "Wrong network" | Use wallet.switchNetwork() to change to Arc testnet |
| "Balance shows 0" | Check: (1) Correct contract address, (2) User deposited, (3) Wallet connected |
| "Voice not working" | Check: (1) Browser allows microphone, (2) ElevenLabs key valid, (3) Cloudflare Workers endpoint active |

### Event Listener Issues
| Issue | Solution |
|-------|----------|
| "Events not detected" | Check: (1) Contract address correct, (2) RPC endpoint valid, (3) Events emitted with correct parameters |
| "Backend webhook fails" | Verify: (1) Backend API running on correct port, (2) URL in .env correct, (3) Network connectivity |
| "Logs not showing" | Check LOG_LEVEL in .env, verify logger.ts configured |

---

## 📊 METRICS & MONITORING

### Key Performance Indicators (KPIs)
| Metric | Target | Tool |
|--------|--------|------|
| Deposit latency | < 5 seconds | Block explorer |
| Withdraw latency | < 10 seconds (buffer) | Block explorer |
| Event sync time | < 30 seconds | Indexer logs |
| Frontend load time | < 2 seconds | DevTools |
| Voice recognition accuracy | > 90% | ElevenLabs metrics |
| AI intent accuracy | > 85% | Backend logs |

### Health Checks
```bash
# Contract deployed?
npx hardhat verify <ADDRESS> --network arc_testnet

# Indexer running?
curl http://localhost:3001/health

# Frontend accessible?
curl https://aila.vercel.app/api/health

# Backend responsive?
curl http://localhost:3000/api/v1/health
```

---

## 🎓 LEARNING RESOURCES

### Solidity (Contracts)
- CryptoZombies: https://cryptozombies.io (interactive tutorial)
- Solidity Docs: https://docs.soliditylang.org
- OpenZeppelin: https://docs.openzeppelin.com/contracts

### React/Next.js (Frontend)
- React Tutorial: https://react.dev/learn
- Next.js Tutorial: https://nextjs.org/learn
- Tailwind CSS: https://tailwindcss.com/docs

### Web3 (Blockchain)
- Ethers.js: https://docs.ethers.org/v6
- EVM Basics: https://ethereum.org/en/developers/docs/evm/
- Smart Contracts 101: https://ethereum.org/en/smart-contracts/

### AI/ML
- Transformers: https://huggingface.co/course
- LLMs: https://platform.openai.com/docs
- Speech AI: https://www.deeplearning.ai/courses/

---

## 📈 DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] All contracts pass Slither scan
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Event listener running and logging
- [ ] Backend responding to intents
- [ ] Voice loop tested end-to-end

### Launch Day
- [ ] Contracts deployed to testnet
- [ ] ABIs exported & available
- [ ] Frontend deployed to production URL
- [ ] Event listener running on server
- [ ] Domain configured (if using custom domain)

### Post-Launch
- [ ] Monitor error rates
- [ ] Check event sync times
- [ ] Verify balance accuracy
- [ ] Test with real users
- [ ] Collect feedback

---

## 💰 COST BREAKDOWN (Testnet)

| Component | Cost | Notes |
|-----------|------|-------|
| Arc Testnet | $0 | Testnet only, no real USDC |
| Cloudflare Workers | $0 | Free tier (generous) |
| ElevenLabs | $0 | Hackathon coupon: 3 mo free |
| AI/ML API | $0 | Promo: ARCHACK20 = $20 free |
| Vercel/Netlify | $0–$20/mo | Hosting (optional paid tier) |
| **Total** | **$0** | **All hackathon resources free!** |

---

## 🎁 HACKATHON RESOURCES RECAP

### What You Get for Free

| Resource | Value | How to Get |
|----------|-------|-----------|
| **ElevenLabs Coupon** | 3 months Creator Plan | Claim on lablab.ai (500 limit!) |
| **AI/ML API Credits** | $20 free | Promo code: ARCHACK20 |
| **Cloudflare Workers AI** | Generous free tier | No signup required |
| **Arc Testnet** | Unlimited | Free RPC access |
| **USDC Faucet** | Testnet USDC | Free mint on faucet |
| **Circle Dev Account** | Free tier | No credit card needed |

### Prizes (if you win!)

| Place | Prize | Category |
|-------|-------|----------|
| 🥇 1st | $5,000 USDC | Overall winner |
| 🥈 2nd | $3,000 USDC | Second place |
| 🥉 3rd | $2,000 USDC | Third place |
| ⭐ Best Voice | 6 mo Scale Plan | ElevenLabs special category |

---

## 🚀 FINAL CHECKLISTS

### Day 1: Setup ✅
- [ ] Project scaffolded
- [ ] Dependencies installed
- [ ] .env files created
- [ ] All resources claimed

### Day 3: Contracts ✅
- [ ] All contracts written
- [ ] All tests passing
- [ ] Slither scan passed
- [ ] Ready for deployment

### Day 5: Indexer ✅
- [ ] Event listener running
- [ ] Webhooks working
- [ ] Logs showing events
- [ ] Reconciliation scheduled

### Day 7: Frontend ✅
- [ ] Wallet connected
- [ ] Balance displaying
- [ ] Transactions working
- [ ] UI polished

### Day 9: Voice ✅
- [ ] STT working
- [ ] Intent parsing working
- [ ] TTS working
- [ ] Full loop tested

### Day 10: Submission ✅
- [ ] Demo video ready
- [ ] Slides prepared
- [ ] GitHub polished
- [ ] Submitted on lablab.ai

---

**You've got all the tools, resources, and knowledge to build AilaBank MVP! 🚀**

*Questions? Check Discord or re-read the Implementation Guides.*

*Good luck, and ship it!* 🎉

---

*AilaBank Hackathon Reference Guide*  
*Oct 28 – Nov 8, 2025*
