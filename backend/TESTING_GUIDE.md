# 🧪 Testing Guide: AI Intent Engine

## Quick Start Testing

### Prerequisites
1. ✅ All API keys set in `.env`:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `SUPABASE_URL` (optional for now)
   - `UPSTASH_REDIS_URL` (optional for now)

2. ✅ Server running:
   ```bash
   npm run dev
   ```

---

## Method 1: Test with Text Input (Recommended First)

### Using cURL
```bash
# Simple deposit
curl -X POST http://localhost:3000/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "text": "Deposit 100 USDC"
  }'

# Withdraw
curl -X POST http://localhost:3000/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "text": "Withdraw 50 dollars"
  }'

# Transfer
curl -X POST http://localhost:3000/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "text": "Transfer 25 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Balance check
curl -X POST http://localhost:3000/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "text": "What is my balance?"
  }'
```

### Using Test Script
```bash
# Make executable (first time only)
chmod +x test/test-api.sh

# Run all tests
./test/test-api.sh

# Or specify custom URL
API_URL=http://localhost:3000 ./test/test-api.sh
```

---

## Method 2: Test with TypeScript Script

```bash
npm run test:intent
```

This runs `test/intent-test.ts` which tests:
- ✅ Multiple text intents
- ✅ Advanced reasoning (allocation, forecasting)
- ✅ Audio processing (if audio file provided)

---

## Method 3: Test with Audio File

### Record Audio (Optional)
1. Record yourself saying "Deposit 100 USDC"
2. Save as `test/audio/test-recording.webm`

### Test Audio
```bash
curl -X POST http://localhost:3000/api/v1/intent \
  -F "audio=@test/audio/test-recording.webm" \
  -F "userId=test-user-123" \
  -F "locale=en"
```

---

## Method 4: Test via Browser/Postman

### Health Check
```
GET http://localhost:3000/health
```

### Intent API (Text)
```
POST http://localhost:3000/api/v1/intent
Content-Type: application/json

{
  "userId": "test-user-123",
  "text": "Deposit 100 USDC"
}
```

### Intent API (Audio)
```
POST http://localhost:3000/api/v1/intent
Content-Type: multipart/form-data

audio: [file]
userId: "test-user-123"
locale: "en"
```

---

## Expected Response Format

```json
{
  "transcript": "Deposit 100 USDC",
  "intent": "deposit",
  "entities": {
    "amount": 100,
    "currency": "USDC",
    "originalText": "Deposit 100 USDC"
  },
  "confidence": 0.95,
  "explanation": "I'll deposit 100 USDC into your account and allocate 80% to yield generation.",
  "audioResponseURL": "/audio/audio_test-user-123_1234567890.mp3",
  "actions": [
    {
      "type": "deposit",
      "params": {
        "amount": 100,
        "currency": "USDC"
      }
    },
    {
      "type": "allocate",
      "params": {
        "bufferPercent": 20,
        "yieldPercent": 80
      }
    }
  ]
}
```

---

## Testing Individual Services

### Test Cloudflare STT (Direct)
```typescript
import { CloudflareAIService } from './src/services/ai/cloudflareAI';
import * as fs from 'fs';

const service = new CloudflareAIService();
const audio = fs.readFileSync('test/audio/test.webm');
const result = await service.speechToText(audio);
console.log('Transcript:', result.text);
```

### Test OpenAI Intent Parsing (Direct)
```typescript
import { OpenAIService } from './src/services/ai/openAIService';

const service = new OpenAIService();
const result = await service.parseIntent("Deposit 100 USDC");
console.log('Intent:', result);
```

### Test ElevenLabs TTS (Direct)
```typescript
import { ElevenLabsService } from './src/services/ai/elevenLabs';

const service = new ElevenLabsService();
const audio = await service.textToSpeech({ text: "Hello, this is Aila!" });
fs.writeFileSync('test-output.mp3', audio);
```

---

## Troubleshooting

### Error: "OPENAI_API_KEY is required"
**Fix**: Make sure `.env` has `OPENAI_API_KEY=sk-...`

### Error: "Speech to text conversion failed"
**Fix**: 
- Check `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
- Verify Cloudflare API token has Workers AI permissions

### Error: "Text to speech conversion failed"
**Fix**:
- Check `ELEVENLABS_API_KEY` is set
- Verify ElevenLabs API key is valid

### Error: "Invalid or expired token" (OpenAI)
**Fix**:
- Check `OPENAI_API_KEY` format (should start with `sk-`)
- Verify you have credits in OpenAI account

### Slow Response Times
**Normal**: 
- First request: 3-5 seconds (cold start)
- Subsequent: 1-3 seconds

**If consistently slow**:
- Check internet connection
- Verify API keys are correct
- Check rate limits on API providers

---

## Test Cases to Try

### Basic Intents
- ✅ "Deposit 100 USDC"
- ✅ "Withdraw 50 dollars"
- ✅ "Transfer 25 USDC to 0x..."
- ✅ "Check my balance"
- ✅ "What's my account status?"

### Complex Intents
- ✅ "Move 35% of idle cash to safest yield, keep $1k liquid"
- ✅ "Create invoice for 200 EUR to customer@example.com"
- ✅ "Set up monthly subscription for 50 USDC"
- ✅ "Update my policy to 30% buffer and 70% yield"

### Edge Cases
- ✅ "Deposit money" (no amount - should handle gracefully)
- ✅ "Send funds" (vague - should ask for clarification)
- ✅ Empty string
- ✅ Very long text

---

## Performance Benchmarks

**Expected Response Times:**
- Text intent: 1-3 seconds
- Audio intent: 3-5 seconds (includes STT)
- Full pipeline (text → intent → explanation → audio): 2-4 seconds

**Cost per Request (Approx):**
- Cloudflare STT: Free (within limits)
- OpenAI GPT-5-nano: ~$0.000015 per intent
- ElevenLabs TTS: ~$0.0001 per response

---

## Next Steps After Testing

Once Phase 2 is working:
1. ✅ Move to Phase 3: Circle Integration
2. ✅ Implement actual transaction execution
3. ✅ Connect to Ramspheld's contracts
4. ✅ Add error handling and retries
5. ✅ Add rate limiting
6. ✅ Add logging/monitoring

---

## Quick Reference

```bash
# Start server
npm run dev

# Test health
curl http://localhost:3000/health

# Test intent (text)
curl -X POST http://localhost:3000/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","text":"Deposit 100 USDC"}'

# Run test suite
npm run test:intent

# Run API test script
./test/test-api.sh
```

Happy testing! 🚀

