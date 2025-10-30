# 🤖 PEDRO'S DETAILED TASK BREAKDOWN
## AI & Backend Orchestrator — Complete Implementation Guide

**Last Updated**: October 30, 2025  
**Target**: AI Agents on Arc with USDC Hackathon (Submission: Nov 8)  
**Your Role**: AI Intent Engine, Backend Orchestrator, Circle Integration, Audit System
> Voice UX responsibility moved here: Pedro owns the full voice stack (STT, intent, TTS, and the frontend Voice Interface component).

---

## 📋 TASK OVERVIEW

| Phase | Tasks | Est. Time | Priority |
|-------|-------|-----------|----------|
| **Backend Setup** | 3 tasks | 4 hours | 🔴 Critical |
| **AI Intent Engine** | 8 tasks | 3 days | 🔴 Critical |
| **Circle Integration** | 6 tasks | 2 days | 🔴 Critical |
| **Backend Orchestrator** | 10 tasks | 3 days | 🔴 Critical |
| **Audit & Logging** | 4 tasks | 1 day | 🟡 High |
| **API Development** | 8 tasks | 2 days | 🔴 Critical |
| **Integration** | 5 tasks | 1 day | 🔴 Critical |
| **Testing & Security** | 4 tasks | 1.5 days | 🟡 High |

**Total Estimated Time**: 10-12 days

---

## 🔵 New Strategic Deliverables (Backend)

1. Corridor Router & PSP Integrations
   - Sponsor banks/EMIs per corridor; 2 off‑ramps per corridor (redundancy)
   - Routing policy: cheapest/fastest with guardrails; failover logic

2. Best‑Rate Guarantee + Proof‑of‑Best‑Execution
   - Quote capture (FX, fees, ETA), route decision, realized execution
   - Immutable receipt ID; store on‑chain reference hash + API retrieval

3. Programmable compliance
   - Jurisdiction‑aware KYC/KYB; sanctions; Travel‑Rule payloads
   - Corridor policy packs; per‑transfer rule evaluation and audit trail

4. Merchant settlement & billing
   - Invoices, subscriptions, refunds; yield‑share accumulator to offset MDR
   - On‑chain receipt anchors; accounting export API

5. Public reliability/cost dashboard API
   - KPIs per corridor: cost on $200, median delivery, success rate, uptime
   - Public JSON endpoints for Florence’s dashboard

6. RateSweep services
   - Idle cash detection across linked accounts + Arc USDC
   - Allocation engine (safest yield, liquidity buffer policies, de‑peg controls)

All new endpoints should be prefixed under `/api/v1/` and emit structured audit logs with correlation IDs and receipt anchors.

---

## 📋 Task Overview — Full Checklist

1) Backend Foundations (Day 1)
- Project scaffold (Express/TS), env management, CORS, rate limiting
- Health, metrics, and structured logging (winston/morgan)
- Postgres schema init (users, ledger, ai_decisions, audit_logs, merchants, invoices, subscriptions, receipts)
- Redis/BullMQ queues for async jobs (routing, settlements, receipts)

2) AI Intent Engine (Days 1–2)
- Cloudflare Workers AI integration (STT + LLM intent)
- Intent orchestrator service with action builder (deposit/withdraw/transfer/allocate)
- Explanation service (concise responses for TTS)
- Confidence thresholds + safe defaults

- Voice UX (Frontend + APIs) (Days 2–3)
- Build `frontend/src/components/VoiceInterface.tsx` (owned here)
- Recording, STT request to Workers AI, submit intent to `/api/v1/intent`
- TTS playback from ElevenLabs; error handling, retries, timeouts
- Multilingual support (locale switching, voice selection via API)
- Command set coverage: deposit, withdraw, transfer, invoice, subscription, policy edits

3) Circle + Wallets (Days 2–3)
- Developer-controlled wallet creation and balances
- Transfers to Arc (USDC) and webhook handlers
- Secure secrets handling and idempotency keys

4) FX and Quote Service (Days 3–4)
- Providers integration (mock + 1 real source where available)
- Normalized quote model: rate, spread, fees, ETA, corridor constraints
- Endpoint: `GET /quotes?from=EUR&to=USDC&amount=...`

5) Corridor Router and Off-Ramps (Days 4–5)
- Corridor policy packs (KYC/KYB, sanctions, Travel-Rule payloads)
- PSP adapters per corridor; at least 2 off-ramps per corridor
- Route scoring (cost, speed, reliability), failover logic
- Endpoint: `POST /route/choose` returns route + policy evaluation

6) Best-Rate Guarantee & Proof-of-Best-Execution (Days 5–6)
- Receipt generator: quote set, chosen route, FX, fees, spread, timestamps
- On-chain anchor (hash) via Ramspheld’s event or minimal anchoring contract
- Endpoints:
  - `POST /receipts/best-exec` (create)
  - `GET /receipts/:id` (fetch)

7) Ledger & Audit (Days 5–6)
- Double-entry style ledger rows for deposits/withdrawals/yield/fees
- Correlation IDs across services; append-only audit trails
- Endpoint: `GET /ledger/stats`, `GET /ledger/user/:id`

8) Merchant Toolkit APIs (Days 6–7)
- Invoices: create, fetch, pay, refund
- Subscriptions: create plan, subscribe, charge, cancel
- Yield-share accumulator: track settlement micro-yield until payout
- Accounting export: CSV + QuickBooks webhook

9) Treasury & RateSweep Services (Days 7–8)
- Idle balance detection across sources (Circle + Arc)
- Policy evaluation: buffer %, APY thresholds, de-peg controls
- Allocation executor: call allocator/buffer per policy
- Endpoints: `POST /ratesweep/run`, `GET /treasury/policies`

10) Public Reliability & Cost Dashboard (Day 8)
- KPIs per corridor: all-in cost on $200, median delivery, success rate
- Public endpoints: `GET /public/kpi/corridors`, `GET /public/status`

11) Webhooks & Indexer Integration (Day 8)
- `/deposit/ack`, `/withdraw/ack`, `/yield/ack` handlers
- Idempotency and signature verification

12) Security & Testing (Day 9)
- Unit tests for services and routes
- Contract/API integration tests (with mocked providers)
- Threat model basics: input validation, auth where needed, rate limits

## 🎯 PHASE 1: BACKEND ENVIRONMENT SETUP

### Task 1.1: Initialize Backend Project

**Objective**: Set up Node.js/TypeScript backend with all required dependencies.

**Steps**:

```bash
# Navigate to project root
cd /home/ramspheld/Projects/Ramspheld/aila

# Create backend directory
mkdir -p backend/{src/{routes,services,middleware,types,utils},test}

# Initialize Node.js project
cd backend
npm init -y

# Install core dependencies
npm install express cors dotenv
npm install @circle-fin/circle-sdk ethers@6
npm install axios redis bullmq
npm install winston morgan

# Install TypeScript and dev dependencies
npm install --save-dev typescript @types/node @types/express
npm install --save-dev @types/cors ts-node nodemon
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Initialize TypeScript
npx tsc --init
```

**File**: `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**File**: `backend/package.json` (update scripts)

```json
{
  "name": "ailabank-backend",
  "version": "1.0.0",
  "description": "AilaBank Backend Orchestrator & AI Engine",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": ["ailabank", "ai", "defi", "usdc"],
  "author": "Pedro",
  "license": "MIT"
}
```

---

### Task 1.2: Configure Environment Variables

**File**: `backend/.env.example`

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Circle API Configuration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_BASE_URL=https://api-sandbox.circle.com

# Arc Blockchain Configuration
ARC_RPC_URL=https://testnet.arc.network/rpc
ARC_CHAIN_ID=12345
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# Smart Contract Addresses (fill after Ramspheld deploys)
AILA_VAULT_ADDRESS=0x...
LIQUIDITY_BUFFER_ADDRESS=0x...
YIELD_ALLOCATOR_ADDRESS=0x...

# AI Service Configuration
# Cloudflare Workers AI
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_AI_GATEWAY_TOKEN=your_ai_gateway_token

# AI/ML API
AIML_API_KEY=your_aiml_api_key
AIML_API_URL=https://api.aimlapi.com/v1

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=default_voice_id

# Redis Configuration (for queues)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Database (PostgreSQL for ledger)
DATABASE_URL=postgresql://user:password@localhost:5432/ailabank
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ailabank
DB_USER=ailauser
DB_PASSWORD=secure_password

# Security
JWT_SECRET=your_jwt_secret_here
API_RATE_LIMIT=100

# Logging
LOG_LEVEL=debug
```

**File**: `backend/.env` (copy from .env.example and fill with real values)

---

### Task 1.3: Setup Database & Redis

**Objective**: Configure PostgreSQL for ledger and Redis for job queues.

**Install PostgreSQL** (if not already installed):

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@14
brew services start postgresql@14

# Create database
sudo -u postgres psql
CREATE DATABASE ailabank;
CREATE USER ailauser WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ailabank TO ailauser;
\q
```

**Install Redis**:

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Test Redis
redis-cli ping
# Should return: PONG
```

**Database Schema** (`backend/src/db/schema.sql`):

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) UNIQUE NOT NULL,
    circle_wallet_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ledger entries
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- deposit, withdraw, yield_accrued
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Decision logs
CREATE TABLE ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    intent_type VARCHAR(50) NOT NULL,
    raw_input TEXT,
    parsed_intent JSONB,
    decision JSONB,
    confidence DECIMAL(3, 2),
    executed BOOLEAN DEFAULT false,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID,
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50),
    inputs JSONB,
    outputs JSONB,
    reasoning TEXT,
    on_chain_proof VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ledger_user_id ON ledger(user_id);
CREATE INDEX idx_ledger_tx_hash ON ledger(tx_hash);
CREATE INDEX idx_ai_decisions_user_id ON ai_decisions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_id ON audit_logs(action_id);
```

**Initialize Database** (`backend/src/db/init.ts`):

```typescript
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function initializeDatabase() {
  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export { pool };
```

**Install pg package**:

```bash
npm install pg @types/pg
```

---

## 🎯 PHASE 2: AI INTENT ENGINE

### Task 2.1: Cloudflare Workers AI Integration

**Objective**: Set up speech-to-text and intent parsing using Cloudflare Workers AI.

**File**: `backend/src/services/ai/cloudflareAI.ts`

```typescript
import axios from 'axios';

interface CloudflareAIConfig {
  accountId: string;
  apiToken: string;
}

interface STTResponse {
  text: string;
  confidence: number;
}

interface IntentResponse {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

export class CloudflareAIService {
  private config: CloudflareAIConfig;
  private baseURL: string;

  constructor() {
    this.config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      apiToken: process.env.CLOUDFLARE_AI_GATEWAY_TOKEN!,
    };
    this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/ai/run`;
  }

  /**
   * Convert speech audio to text
   * @param audioBuffer Audio file buffer (mp3, wav, etc.)
   * @returns Transcribed text
   */
  async speechToText(audioBuffer: Buffer): Promise<STTResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/@cf/openai/whisper`,
        audioBuffer,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      return {
        text: response.data.result.text,
        confidence: response.data.result.confidence || 0.9,
      };
    } catch (error) {
      console.error('Cloudflare STT Error:', error);
      throw new Error('Speech to text conversion failed');
    }
  }

  /**
   * Parse intent from text using LLM
   * @param text User input text
   * @returns Parsed intent and entities
   */
  async parseIntent(text: string): Promise<IntentResponse> {
    const prompt = this.buildIntentPrompt(text);

    try {
      const response = await axios.post(
        `${this.baseURL}/@cf/meta/llama-3-8b-instruct`,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a banking assistant. Parse user commands into structured JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 256,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const parsed = this.parseIntentResponse(response.data.result.response);
      return parsed;
    } catch (error) {
      console.error('Cloudflare Intent Parse Error:', error);
      throw new Error('Intent parsing failed');
    }
  }

  /**
   * Build prompt for intent parsing
   */
  private buildIntentPrompt(text: string): string {
    return `
Parse the following user command into JSON format with these fields:
- intent: one of [deposit, withdraw, transfer, check_balance, allocate_yield, get_status]
- amount: numeric value if mentioned
- currency: currency code if mentioned (default USDC)
- target: recipient address or account if transfer
- confidence: 0-1 score of how confident you are

User command: "${text}"

Return ONLY valid JSON, no explanation.
`;
  }

  /**
   * Parse LLM response into structured intent
   */
  private parseIntentResponse(response: string): IntentResponse {
    try {
      // Extract JSON from response (LLM might add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: parsed.intent || 'unknown',
        entities: {
          amount: parsed.amount,
          currency: parsed.currency || 'USDC',
          target: parsed.target,
        },
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Intent parsing error:', error);
      // Fallback: basic pattern matching
      return this.fallbackIntentParse(response);
    }
  }

  /**
   * Fallback intent parsing using regex
   */
  private fallbackIntentParse(text: string): IntentResponse {
    const lowerText = text.toLowerCase();
    let intent = 'unknown';
    let amount = 0;
    let currency = 'USDC';

    // Pattern matching
    if (lowerText.includes('deposit') || lowerText.includes('add')) {
      intent = 'deposit';
    } else if (lowerText.includes('withdraw') || lowerText.includes('send')) {
      intent = 'withdraw';
    } else if (lowerText.includes('balance') || lowerText.includes('how much')) {
      intent = 'check_balance';
    } else if (lowerText.includes('transfer')) {
      intent = 'transfer';
    }

    // Extract amount
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // Extract currency
    const currencyMatch = text.match(/\b(USD|USDC|EUR|KES|NGN)\b/i);
    if (currencyMatch) {
      currency = currencyMatch[1].toUpperCase();
    }

    return {
      intent,
      entities: { amount, currency },
      confidence: 0.6,
    };
  }

  /**
   * Generate explanation for AI decision
   */
  async generateExplanation(
    action: string,
    inputs: Record<string, any>
  ): Promise<string> {
    const prompt = `
Explain the following banking action in simple, friendly language (1-2 sentences):

Action: ${action}
Details: ${JSON.stringify(inputs, null, 2)}

Be concise and reassuring.
`;

    try {
      const response = await axios.post(
        `${this.baseURL}/@cf/meta/llama-3-8b-instruct`,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful banking assistant named Aila.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 128,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.result.response.trim();
    } catch (error) {
      console.error('Explanation generation error:', error);
      return `Action completed: ${action}`;
    }
  }
}
```

---

### Task 2.2: ElevenLabs TTS Integration

**Objective**: Convert text responses to lifelike speech using ElevenLabs.

**File**: `backend/src/services/ai/elevenLabs.ts`

```typescript
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TTSOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export class ElevenLabsService {
  private apiKey: string;
  private voiceId: string;
  private baseURL = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'default';
  }

  /**
   * Convert text to speech
   * @param options TTS configuration
   * @returns Audio buffer
   */
  async textToSpeech(options: TTSOptions): Promise<Buffer> {
    const {
      text,
      voiceId = this.voiceId,
      stability = 0.5,
      similarityBoost = 0.75,
    } = options;

    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error);
      throw new Error('Text to speech conversion failed');
    }
  }

  /**
   * Stream TTS directly to response
   * @param text Text to convert
   * @param outputPath Path to save audio file
   */
  async textToSpeechFile(text: string, outputPath: string): Promise<string> {
    const audioBuffer = await this.textToSpeech({ text });
    
    fs.writeFileSync(outputPath, audioBuffer);
    return outputPath;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices;
    } catch (error) {
      console.error('Get voices error:', error);
      return [];
    }
  }

  /**
   * Convert response text to audio URL (for frontend)
   * Saves audio file and returns URL
   */
  async generateAudioResponse(text: string, userId: string): Promise<string> {
    const filename = `audio_${userId}_${Date.now()}.mp3`;
    const outputPath = path.join(__dirname, '../../../public/audio', filename);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await this.textToSpeechFile(text, outputPath);

    // Return URL for frontend to fetch
    return `/audio/${filename}`;
  }
}
```

---

### Task 2.3: AI/ML API Integration

**Objective**: Use AI/ML API for advanced reasoning and forecasting.

**File**: `backend/src/services/ai/aimlAPI.ts`

```typescript
import axios from 'axios';

interface ForecastRequest {
  userId: string;
  historicalData: {
    date: string;
    amount: number;
  }[];
  horizon: number; // days to forecast
}

interface ForecastResponse {
  predictions: {
    date: string;
    expectedWithdrawal: number;
    confidence: number;
  }[];
}

interface AllocationRecommendation {
  bufferPercent: number;
  yieldPercent: number;
  reasoning: string;
}

export class AIMLAPIService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.AIML_API_KEY!;
    this.baseURL = process.env.AIML_API_URL || 'https://api.aimlapi.com/v1';
  }

  /**
   * Forecast user liquidity needs using time-series model
   */
  async forecastLiquidity(request: ForecastRequest): Promise<ForecastResponse> {
    const prompt = this.buildForecastPrompt(request);

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a financial forecasting AI. Analyze transaction patterns and predict future liquidity needs.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent predictions
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return this.parseForecastResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('AI/ML API Forecast Error:', error);
      // Return fallback forecast
      return this.generateFallbackForecast(request);
    }
  }

  /**
   * Get allocation recommendation based on user behavior
   */
  async recommendAllocation(
    userId: string,
    balance: number,
    recentActivity: any[]
  ): Promise<AllocationRecommendation> {
    const prompt = `
Analyze user financial behavior and recommend allocation strategy:

User Balance: $${balance} USDC
Recent Transactions: ${JSON.stringify(recentActivity, null, 2)}

Recommend what % should go to:
1. Liquidity Buffer (instant withdrawal)
2. Yield Generation (earn interest)

Return JSON: { "bufferPercent": 20, "yieldPercent": 80, "reasoning": "explanation" }
`;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a treasury management AI.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        bufferPercent: 20,
        yieldPercent: 80,
        reasoning: 'Standard allocation for balanced liquidity and yield.',
      };
    } catch (error) {
      console.error('Allocation recommendation error:', error);
      return {
        bufferPercent: 20,
        yieldPercent: 80,
        reasoning: 'Default allocation strategy.',
      };
    }
  }

  /**
   * Build forecast prompt from historical data
   */
  private buildForecastPrompt(request: ForecastRequest): string {
    return `
Analyze the following transaction history and predict liquidity needs for the next ${request.horizon} days:

Historical Data:
${JSON.stringify(request.historicalData, null, 2)}

Return predictions in JSON format:
{
  "predictions": [
    { "date": "2025-11-01", "expectedWithdrawal": 50, "confidence": 0.85 }
  ]
}
`;
  }

  /**
   * Parse forecast response from AI
   */
  private parseForecastResponse(content: string): ForecastResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON in response');
    } catch (error) {
      return { predictions: [] };
    }
  }

  /**
   * Generate simple fallback forecast
   */
  private generateFallbackForecast(request: ForecastRequest): ForecastResponse {
    const avgWithdrawal =
      request.historicalData.reduce((sum, d) => sum + d.amount, 0) /
      request.historicalData.length;

    const predictions = [];
    for (let i = 1; i <= request.horizon; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      predictions.push({
        date: date.toISOString().split('T')[0],
        expectedWithdrawal: avgWithdrawal,
        confidence: 0.5,
      });
    }

    return { predictions };
  }
}
```

---

### Task 2.4: Intent Orchestration Service

**Objective**: Combine all AI services into unified intent processor.

**File**: `backend/src/services/ai/intentOrchestrator.ts`

```typescript
import { CloudflareAIService } from './cloudflareAI';
import { ElevenLabsService } from './elevenLabs';
import { AIMLAPIService } from './aimlAPI';

export interface IntentRequest {
  userId: string;
  audio?: Buffer;
  text?: string;
  context?: Record<string, any>;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  explanation: string;
  audioResponseURL?: string;
  actions: Action[];
}

export interface Action {
  type: 'deposit' | 'withdraw' | 'allocate' | 'transfer';
  params: Record<string, any>;
}

export class IntentOrchestrator {
  private cloudflareAI: CloudflareAIService;
  private elevenLabs: ElevenLabsService;
  private aimlAPI: AIMLAPIService;

  constructor() {
    this.cloudflareAI = new CloudflareAIService();
    this.elevenLabs = new ElevenLabsService();
    this.aimlAPI = new AIMLAPIService();
  }

  /**
   * Main intent processing pipeline
   */
  async processIntent(request: IntentRequest): Promise<IntentResult> {
    let inputText: string;

    // Step 1: Convert audio to text if needed
    if (request.audio) {
      const sttResult = await this.cloudflareAI.speechToText(request.audio);
      inputText = sttResult.text;
    } else if (request.text) {
      inputText = request.text;
    } else {
      throw new Error('No audio or text input provided');
    }

    // Step 2: Parse intent
    const intentResult = await this.cloudflareAI.parseIntent(inputText);

    // Step 3: Build actions based on intent
    const actions = this.buildActions(intentResult);

    // Step 4: Generate explanation
    const explanation = await this.cloudflareAI.generateExplanation(
      intentResult.intent,
      intentResult.entities
    );

    // Step 5: Generate audio response
    const audioURL = await this.elevenLabs.generateAudioResponse(
      explanation,
      request.userId
    );

    return {
      intent: intentResult.intent,
      entities: intentResult.entities,
      confidence: intentResult.confidence,
      explanation,
      audioResponseURL: audioURL,
      actions,
    };
  }

  /**
   * Build executable actions from parsed intent
   */
  private buildActions(intent: any): Action[] {
    const actions: Action[] = [];

    switch (intent.intent) {
      case 'deposit':
        actions.push({
          type: 'deposit',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
          },
        });
        // Auto-allocate after deposit
        actions.push({
          type: 'allocate',
          params: {
            bufferPercent: 20,
            yieldPercent: 80,
          },
        });
        break;

      case 'withdraw':
        actions.push({
          type: 'withdraw',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
            target: intent.entities.target,
          },
        });
        break;

      case 'transfer':
        actions.push({
          type: 'transfer',
          params: {
            amount: intent.entities.amount,
            to: intent.entities.target,
            currency: intent.entities.currency || 'USDC',
          },
        });
        break;

      default:
        // No action for status checks, balance queries, etc.
        break;
    }

    return actions;
  }

  /**
   * Get allocation recommendation
   */
  async getSmartAllocation(
    userId: string,
    balance: number,
    activity: any[]
  ) {
    return this.aimlAPI.recommendAllocation(userId, balance, activity);
  }

  /**
   * Get liquidity forecast
   */
  async forecastUserLiquidity(userId: string, historicalData: any[]) {
    return this.aimlAPI.forecastLiquidity({
      userId,
      historicalData,
      horizon: 7, // 7 day forecast
    });
  }
}
```

---

## 🎯 PHASE 3: CIRCLE INTEGRATION

### Task 3.1: Circle SDK Setup

**File**: `backend/src/services/circle/circleService.ts`

```typescript
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { v4 as uuidv4 } from 'uuid';

interface CreateWalletRequest {
  userId: string;
  address: string;
}

interface DepositRequest {
  walletId: string;
  amount: string;
  currency: string;
}

export class CircleService {
  private client: Circle;

  constructor() {
    this.client = new Circle(
      process.env.CIRCLE_API_KEY!,
      CircleEnvironments.sandbox // Use 'production' for mainnet
    );
  }

  /**
   * Create developer-controlled wallet for user
   */
  async createWallet(request: CreateWalletRequest): Promise<any> {
    try {
      const response = await this.client.wallets.createWallet({
        idempotencyKey: uuidv4(),
        description: `AilaBank wallet for ${request.address}`,
        metadata: {
          userId: request.userId,
          ethereumAddress: request.address,
        },
      });

      console.log('✅ Wallet created:', response.data.wallet.walletId);
      return response.data.wallet;
    } catch (error) {
      console.error('❌ Wallet creation failed:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<any> {
    try {
      const response = await this.client.wallets.getWallet(walletId);
      return response.data.wallet.balances;
    } catch (error) {
      console.error('❌ Get balance failed:', error);
      throw error;
    }
  }

  /**
   * Transfer USDC from Circle wallet to Arc chain
   */
  async transferToArc(
    walletId: string,
    destinationAddress: string,
    amount: string
  ): Promise<any> {
    try {
      const response = await this.client.transfers.createTransfer({
        idempotencyKey: uuidv4(),
        source: {
          type: 'wallet',
          id: walletId,
        },
        destination: {
          type: 'blockchain',
          address: destinationAddress,
          chain: 'ARC', // Adjust based on Circle's Arc support
        },
        amount: {
          amount,
          currency: 'USD',
        },
      });

      console.log('✅ Transfer initiated:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      throw error;
    }
  }

  /**
   * Handle webhook notifications from Circle
   */
  async handleWebhook(payload: any): Promise<void> {
    const { notificationType, notification } = payload;

    switch (notificationType) {
      case 'transfers':
        await this.handleTransferNotification(notification);
        break;
      case 'payments':
        await this.handlePaymentNotification(notification);
        break;
      default:
        console.log('Unhandled notification type:', notificationType);
    }
  }

  private async handleTransferNotification(notification: any): Promise<void> {
    console.log('Transfer notification:', notification);
    // Update database with transfer status
    // Trigger contract deposit if needed
  }

  private async handlePaymentNotification(notification: any): Promise<void> {
    console.log('Payment notification:', notification);
    // Handle incoming payments
  }
}
```

**Install Circle SDK**:

```bash
npm install @circle-fin/circle-sdk uuid @types/uuid
```

---

I'll continue with more tasks in the next response. Would you like me to continue with:

1. **Circle Integration (continued)** - conversion engine, CCTP integration
2. **Backend Orchestrator** - API routes, action executor, queue system
3. **Audit & Logging** - comprehensive audit trail system
4. **Testing & Security** - test suites and security measures

Or should I also create **Florence's detailed tasks** document next?