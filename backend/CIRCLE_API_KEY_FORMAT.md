# 🔑 Circle API Key Format Guide

## Problem: "malformed API key" Error

If you see this error:
```
malformed API key. API key should contain three substrings, separated by a colon.
```

It means your Circle API key doesn't match the required format.

## Correct Format

Circle API keys (generated after May 2023) must be in this format:

```
TEST_API_KEY:key-id:key-secret
```

Or for production:
```
LIVE_API_KEY:key-id:key-secret
```

## Example

**Sandbox (Testing)**:
```
TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
```

**Production**:
```
LIVE_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
```

## How to Get a Correct API Key

1. **Go to Circle Console**: https://console.circle.com
2. **Navigate to**: API Keys → Create API Key
3. **Select Environment**: 
   - Choose **Sandbox** for testing
   - Choose **Production** for live use
4. **Copy the ENTIRE key**: Make sure you copy all three parts with colons

## Setting in `.env`

```bash
# Sandbox (Testing)
CIRCLE_API_KEY=TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d

# Production
CIRCLE_API_KEY=LIVE_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
```

## Common Mistakes

### ❌ Wrong: Missing colons
```bash
CIRCLE_API_KEY=TEST_API_KEY ebb3ad72232624921abc4b162148bb84 019ef3358ef9cd6d08fc32csfe89a68d
```

### ❌ Wrong: Only one part
```bash
CIRCLE_API_KEY=ebb3ad72232624921abc4b162148bb84
```

### ❌ Wrong: Old format (pre-May 2023)
```bash
CIRCLE_API_KEY=your_old_api_key_format
```

### ✅ Correct: Three parts with colons
```bash
CIRCLE_API_KEY=TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
```

## Verification

After setting your API key, restart your server and check:

1. **Server starts without errors** ✅
2. **No "malformed API key" errors** ✅
3. **Can create wallets** ✅

## If You Still Have Issues

1. **Check your key format**: Count the colons (should be 2)
2. **Check for extra spaces**: Make sure there are no spaces before/after
3. **Get a new key**: Create a fresh API key in Circle Console
4. **Verify environment**: Make sure you're using the right key for sandbox vs production

## Environment Detection

The code automatically detects the environment from your API key prefix:
- `TEST_API_KEY` → Sandbox
- `LIVE_API_KEY` → Production

You can also set `CIRCLE_BASE_URL` to override:
```bash
CIRCLE_BASE_URL=https://api-sandbox.circle.com  # Forces sandbox
CIRCLE_BASE_URL=https://api.circle.com         # Forces production
```

---

**Need help?** Check `CIRCLE_TESTING_GUIDE.md` for more troubleshooting tips.

