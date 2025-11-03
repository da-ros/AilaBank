# AilaBank Frontend - Agentic Banking Interface

A voice-first, AI-powered banking interface that connects to your deployed smart contracts on Arc testnet. Users interact with blockchain through natural conversation.

## 🎯 Features

### ✅ Completed
- **Voice Agent** - Talk to Aila using your microphone
- **Chat Agent** - Type commands in natural language  
- **Real Blockchain Integration** - Connects to your deployed contracts
- **Wallet Connection** - MetaMask integration with Arc testnet
- **Contract Hooks** - React hooks for vault, buffer, and yield operations
- **Real-time Updates** - Event listeners for instant balance updates
- **TTS/STT** - ElevenLabs & Cloudflare Workers AI integration

### 🏗️ Architecture

```
User Voice/Text Input
        ↓
AI Intent Parser (in VoiceAgent/ChatAgent)
        ↓
React Hooks (useVault, useWallet)
        ↓
Ethers.js → Arc Testnet Smart Contracts
        ↓
Event Listeners → UI Updates
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd app
npm install ethers
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required:**
- `NEXT_PUBLIC_ARC_RPC_URL` - Arc testnet RPC endpoint
- `NEXT_PUBLIC_AILA_VAULT_ADDRESS` - Your deployed AilaVault address
- `NEXT_PUBLIC_USDC_ADDRESS` - USDC contract on Arc testnet

**Optional (for full voice features):**
- `ELEVENLABS_API_KEY` - For text-to-speech
- `CLOUDFLARE_API_TOKEN` - For speech-to-text
- `OPENAI_API_KEY` - Fallback STT

### 3. Copy Contract ABIs

Ensure your contract ABIs are in `public/abis/`:

```bash
cp ../contracts/artifacts/contracts/AilaVault.sol/AilaVault.json public/abis/
cp ../contracts/artifacts/contracts/LiquidityBuffer.sol/LiquidityBuffer.json public/abis/
cp ../contracts/artifacts/contracts/YieldAllocator.sol/YieldAllocator.json public/abis/
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and navigate to `/agentic-dashboard`

## 📁 File Structure

```
app/
├── hooks/
│   ├── useWallet.ts           # MetaMask connection & network switching
│   └── useVault.ts            # Contract interactions (deposit/withdraw)
├── components/
│   ├── voice/
│   │   └── VoiceAgent.tsx     # Voice input/output interface
│   └── chat/
│       └── ChatAgent.tsx      # Text chat interface
├── app/
│   ├── agentic-dashboard/
│   │   └── page.tsx           # Main AI agent dashboard
│   └── api/
│       └── voice/
│           ├── transcribe/    # Speech-to-text endpoint
│           └── speak/         # Text-to-speech endpoint
└── public/
    └── abis/                  # Contract ABIs
```

## 🎙️ Voice Commands

Users can say:

- **"Deposit 100 USDC"** - Deposits to vault
- **"What's my balance?"** - Shows balance breakdown
- **"Withdraw 50 dollars"** - Withdraws from vault
- **"How much yield have I earned?"** - Shows yield info

## 💬 Chat Commands

Same as voice, but typed:

```
User: deposit 100 USDC
Aila: ✅ Successfully deposited 100 USDC! Your money is now earning 5% APY.

User: what's my balance?
Aila: 💰 Your Account Summary:
• Principal: 100 USDC
• Yield Earned: 0.05 USDC
• Total Balance: 100.05 USDC
• Current APY: 5%
```

## 🔧 How It Works

### Voice Flow

1. User clicks microphone button
2. Browser captures audio via Web Audio API
3. Audio sent to `/api/voice/transcribe` (Cloudflare Workers AI or OpenAI Whisper)
4. Text parsed for intent (deposit/withdraw/balance/yield)
5. If blockchain action needed:
   - Calls `useVault` hook
   - Submits transaction via ethers.js
   - Waits for confirmation
6. Response generated and sent to `/api/voice/speak` (ElevenLabs TTS)
7. Audio plays back to user

### Chat Flow

1. User types message
2. Intent parsed locally in `ChatAgent.tsx`
3. If blockchain action needed, calls `useVault` hook
4. Transaction submitted and confirmed
5. Response shown in chat with formatting

### Blockchain Integration

```typescript
// Example: User says "deposit 100 USDC"

// 1. Parse intent
const amount = "100"

// 2. Call contract via hook
await deposit(amount)

// 3. Hook executes:
const vault = new ethers.Contract(VAULT_ADDRESS, ABI, signer)
const amountInUnits = ethers.parseUnits(amount, 6) // USDC = 6 decimals

// Approve USDC
await usdcContract.approve(VAULT_ADDRESS, amountInUnits)

// Deposit
await vault.deposit(amountInUnits)

// 4. Listen for event
vault.on('Deposit', (user, amount, timestamp) => {
  // Refresh balances
  fetchBalances()
})
```

## 🛠️ API Endpoints

### `POST /api/voice/transcribe`

Converts audio to text.

**Request:**
```
Content-Type: multipart/form-data
audio: <audio-blob>
```

**Response:**
```json
{
  "text": "deposit 100 USDC",
  "confidence": 0.95
}
```

### `POST /api/voice/speak`

Converts text to audio.

**Request:**
```json
{
  "text": "Successfully deposited 100 USDC"
}
```

**Response:**
```
Content-Type: audio/mpeg
<audio-data>
```

## 📊 Contract Hooks API

### `useWallet()`

```typescript
const {
  account,           // string | null - Connected address
  provider,          // BrowserProvider | null
  signer,            // Signer | null
  chainId,           // number | null
  isConnected,       // boolean
  isCorrectNetwork,  // boolean (true if on Arc testnet)
  connect,           // () => Promise<void>
  disconnect,        // () => void
  switchNetwork,     // () => Promise<void>
} = useWallet()
```

### `useVault()`

```typescript
const {
  userBalance,       // string - Principal balance
  userYield,         // string - Earned yield
  totalBalance,      // string - Principal + yield
  apy,               // string - Current APY percentage
  tvl,               // string - Total value locked
  loading,           // boolean
  error,             // string | null
  deposit,           // (amount: string) => Promise<Transaction>
  withdraw,          // (amount: string) => Promise<Transaction>
  refreshBalances,   // () => Promise<void>
} = useVault()
```

## 🎯 Next Steps

1. **Deploy Contracts** - Follow `contracts/DEPLOYMENT.md`
2. **Get Testnet USDC** - Use Arc faucet
3. **Configure APIs** - Set up ElevenLabs & Cloudflare accounts
4. **Test Voice/Chat** - Try commands in the interface
5. **Add Features** - Transaction history, yield charts, etc.

## 🐛 Troubleshooting

### "MetaMask not installed"
- Install [MetaMask](https://metamask.io/)
- Refresh page and click "Connect Wallet"

### "Wrong network"
- App will prompt to switch to Arc testnet
- Confirm in MetaMask popup

### "Insufficient funds"
- Get testnet USDC from [Arc faucet](https://faucet.arc.network)
- Need USDC for deposits and gas fees

### "Transaction failed"
- Check you have enough USDC balance
- Ensure you approved USDC spending
- Check Arc testnet is operational

### Voice not working
- Grant microphone permissions in browser
- Check `ELEVENLABS_API_KEY` is set
- Check `CLOUDFLARE_API_TOKEN` is set
- Fallback: Use chat interface instead

## 📖 Resources

- [Arc Docs](https://docs.arc.network)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)

## 🏆 Hackathon Submission

This frontend demonstrates:
- ✅ AI Agents managing blockchain operations
- ✅ Voice-first UX (ElevenLabs integration)
- ✅ Natural language understanding
- ✅ Real USDC transactions on Arc
- ✅ Seamless user experience (no complex blockchain jargon)

Users never see addresses, gas fees, or technical details - just talk naturally to manage money!
