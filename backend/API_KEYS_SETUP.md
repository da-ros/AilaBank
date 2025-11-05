# 🔑 API Keys Setup Guide

## Required API Keys

### 1. **Cloudflare Workers AI** (STT only)
**Purpose**: Speech-to-Text conversion

**How to get:**
1. Sign up at https://dash.cloudflare.com
2. Go to **Workers AI** section
3. Copy your **Account ID** (found in right sidebar)
4. Go to **API Tokens** → Create token with Workers AI permissions
5. Copy the token

**Env vars:**
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

**Note**: Use the Workers AI API token, NOT AI Gateway token.

---

### 2. **OpenAI** (Intent, Explanations, Reasoning)
**Purpose**: Intent parsing, explanation generation, advanced reasoning

**How to get:**
1. Sign up at https://platform.openai.com
2. Go to **API Keys** section
3. Click **Create new secret key**
4. Copy the key (starts with `sk-`)

**Env var:**
```
OPENAI_API_KEY=sk-your_key_here
```

**Model used**: `gpt-5-nano` (latest generation, cost-effective, fast)

---

### 3. **ElevenLabs** (TTS)
**Purpose**: Text-to-Speech for voice responses

**How to get:**
1. Sign up at https://elevenlabs.io
2. Go to **Profile** → **API Keys**
3. Copy your API key
4. Go to **Voices** tab to see available voice IDs

**Env vars:**
```
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Default voice (or choose another)
```

**Hackathon**: Use the ElevenLabs coupon from lablab.ai (3 months free!)

---

### 4. **Circle API** (Wallets & Transfers)
**Purpose**: Developer-controlled wallets, USDC transfers

**How to get:**
1. Sign up at https://console.circle.com
2. Create a developer account
3. Go to **API Keys** → **Create API Key**
4. **Important**: Circle API keys must be in a specific format:
   - **Sandbox**: `TEST_API_KEY:key-id:key-secret`
   - **Production**: `LIVE_API_KEY:key-id:key-secret`
5. Copy the entire API key (all three parts separated by colons)
6. Copy Entity Secret (if needed)

**Env vars:**
```bash
# Circle API key format: TEST_API_KEY:key-id:key-secret
# Example: TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
CIRCLE_API_KEY=TEST_API_KEY:your_key_id:your_key_secret

# Entity Secret (required for developer-controlled wallets)
# IMPORTANT: This must be the UNENCRYPTED secret (64 hex characters), NOT the ciphertext!
# The SDK automatically generates fresh ciphertexts for each API request.
#
# Generate with: ts-node test/generate-entity-secret.ts
# Or: openssl rand -hex 32
# Example: CIRCLE_ENTITY_SECRET=a1b2c3d4e5f6... (64 hex characters)
CIRCLE_ENTITY_SECRET=your_hex_encoded_entity_secret_here
#
# ⚠️ IMPORTANT: After setting CIRCLE_ENTITY_SECRET, you MUST register it:
#   Option 1: ts-node test/register-entity-secret.ts
#   Option 2: POST /api/v1/circle/register-entity-secret
#   Option 3: Circle Console → Developer Services → Configuration
#
# Note: If you have CIRCLE_ENTITY_SECRET_CIPHERTEXT, that's NOT what you need here.
# The SDK requires the unencrypted secret. See CIRCLE_ENTITY_SECRET_EXPLAINED.md for details.

# Wallet configuration (developer-controlled wallets)
# After creating a wallet set, update this value
CIRCLE_WALLET_SET_ID=your_wallet_set_id

# Default blockchain(s) for new wallets (comma-separated, e.g., ETH-SEPOLIA,MATIC-AMOY)
CIRCLE_WALLET_BLOCKCHAINS=ETH-SEPOLIA

# Wallet account type: SCA (smart contract account) or EOA (externally owned)
CIRCLE_WALLET_ACCOUNT_TYPE=SCA

# Number of wallets to create per request (1-20)
CIRCLE_WALLET_COUNT=1

# Optional: Base URL (auto-detected from API key prefix)
CIRCLE_BASE_URL=https://api-sandbox.circle.com  # Use sandbox for testnet
```

**⚠️ Important**: 
- The API key must contain **three parts separated by colons** (`:`)
- If you see "malformed API key" error, your key format is incorrect
- API keys generated after May 2023 use this format
- Get a new API key from Circle Console if yours doesn't match this format

---

## Quick Setup

1. Copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```

2. Fill in your API keys in `.env`

3. Test each service:
```bash
# Test OpenAI (replace with your key)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"

# Test ElevenLabs (replace with your key)
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: your-key"

# Test Cloudflare (replace account ID and token)
curl https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run/@cf/openai/whisper-large-v3-turbo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -X POST \
  --data-binary @audio.webm
```

---

## Cost Estimates (MVP)

- **Cloudflare Workers AI**: Free tier (generous) - should be enough for MVP
- **OpenAI GPT-5-nano**: Latest generation model, optimized for cost and performance
  - Intent parsing: ~100 tokens per request = **$0.000015 per intent**
  - Explanation: ~50 tokens per request = **$0.00003 per explanation**
- **ElevenLabs**: Hackathon coupon (3 months free) or pay-as-you-go
- **Circle**: Free tier for sandbox testing

**Total MVP cost**: Essentially $0 (free tiers + hackathon coupons)

