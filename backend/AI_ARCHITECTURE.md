# 🤖 AI Architecture - Updated

## Model Selection Summary

**✅ Decision**: Use OpenAI GPT-5-nano for all text-based AI tasks (intent, explanations, reasoning)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Voice Input                          │
│              (Audio from frontend)                      │
└──────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  1. Cloudflare Workers AI (STT)                        │
│     Model: @cf/openai/whisper-large-v3-turbo            │
│     Output: Transcribed text                           │
└──────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  2. OpenAI GPT-5-nano (Intent Parsing)                 │
│     Input: Transcribed text                             │
│     Output: Structured intent + entities                │
└──────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  3. OpenAI GPT-5-nano (Explanation Generation)          │
│     Input: Intent + entities                             │
│     Output: Human-readable explanation                   │
└──────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  4. ElevenLabs (TTS)                                    │
│     Input: Explanation text                              │
│     Output: Audio file (MP3)                            │
└─────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### CloudflareAIService
- **ONLY**: Speech-to-Text
- Uses: `@cf/openai/whisper-large-v3-turbo` via Workers AI
- Why: Fast, edge-optimized, free tier sufficient for MVP

### OpenAIService
- Intent Parsing (structured JSON output)
- Explanation Generation (natural language)
- Advanced Reasoning (allocation recommendations, liquidity forecasting)
- Uses: `gpt-5-nano` (cost-effective, capable, latest generation)
- Why: Better structured output than Llama-3-8b, more reliable for financial domain

### ElevenLabsService
- Text-to-Speech for voice responses
- Multiple voice support for localization
- Why: Best quality TTS, hackathon coupon available

## Removed Services

❌ **AI/ML API** - No longer needed (replaced by OpenAI)
❌ **Cloudflare Workers AI for LLM tasks** - Moved to OpenAI

## Environment Variables

```bash
# Cloudflare (STT only)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...  # Workers AI token, not AI Gateway

# OpenAI (Intent, Explanations, Reasoning)
OPENAI_API_KEY=sk-...

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## Cost Comparison

| Service | Model | Cost per 1M tokens | Notes |
|---------|-------|-------------------|-------|
| Cloudflare Workers AI | Whisper Large v3 Turbo | Free tier | Sufficient for MVP |
| OpenAI | GPT-5-nano | Cost-effective | Latest generation model |
| ElevenLabs | TTS | Hackathon coupon | 3 months free |

**MVP Total**: ~$0 (free tiers + coupons)

## Why GPT-5-nano > Llama-3-8b-instruct?

1. **Better structured JSON output** - More reliable for intent parsing
2. **Financial domain understanding** - Trained on more banking/finance data
3. **Consistency** - Lower hallucination rate for critical banking actions
4. **API reliability** - OpenAI's API is more stable than open-source alternatives
5. **Cost-effective** - Similar price to smaller models, much better quality

