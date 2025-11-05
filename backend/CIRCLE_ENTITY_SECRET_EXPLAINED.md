# 🔐 Circle Entity Secret: Unencrypted vs Ciphertext

## Understanding the Difference

### CIRCLE_ENTITY_SECRET (Unencrypted - REQUIRED)
- **What it is**: The original 32-byte hex-encoded secret (64 hex characters)
- **Format**: `a1b2c3d4e5f6...` (64 hex characters)
- **When to use**: 
  - ✅ **Required for SDK operations** (this is what you need!)
  - ✅ For registration via SDK
  - ✅ The SDK uses this to generate fresh ciphertexts automatically

### CIRCLE_ENTITY_SECRET_CIPHERTEXT (Encrypted - Optional)
- **What it is**: The encrypted version of the entity secret (RSA encrypted, Base64 encoded)
- **Format**: `eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkEyNTZHQ00ifQ...` (684 characters)
- **When to use**:
  - ❌ **NOT used by the SDK** (SDK generates its own ciphertexts)
  - ✅ Only for direct API calls (without SDK)
  - ✅ For manual registration via Circle Console

## Why the SDK Needs the Unencrypted Secret

According to [Circle's documentation](https://developers.circle.com/wallets/dev-controlled/register-entity-secret):

> "The ciphertext must be re-encrypted (rotated) whenever an API requires it."

This means:
1. **Each API request needs a NEW ciphertext** (for security)
2. The SDK automatically generates fresh ciphertexts from the unencrypted secret
3. You cannot reuse the same ciphertext for multiple requests

## Setup Instructions

### If You Only Have CIRCLE_ENTITY_SECRET_CIPHERTEXT

**Problem**: You registered via Circle Console using ciphertext, but the SDK needs the unencrypted secret.

**Solution**:
1. **If you have the original unencrypted secret**:
   - Add it to `.env`: `CIRCLE_ENTITY_SECRET=<your-unencrypted-secret>`
   - The SDK will work automatically

2. **If you don't have the original unencrypted secret**:
   - Generate a new one: `ts-node test/generate-entity-secret.ts`
   - Register it: `ts-node test/register-entity-secret.ts`
   - This will register a new entity secret (the old one will be replaced)

### If You Have Neither

1. Generate a new entity secret:
   ```bash
   cd backend
   ts-node test/generate-entity-secret.ts
   ```

2. Copy the output to `.env`:
   ```bash
   CIRCLE_ENTITY_SECRET=your_generated_secret_here
   ```

3. Register it:
   ```bash
   ts-node test/register-entity-secret.ts
   ```

## Common Scenarios

### Scenario 1: Using the SDK (Recommended)
```bash
# .env
CIRCLE_ENTITY_SECRET=a1b2c3d4e5f6...  # Unencrypted (64 hex chars)
# CIRCLE_ENTITY_SECRET_CIPHERTEXT=...  # NOT NEEDED (SDK ignores this)
```

The SDK will:
- ✅ Automatically generate fresh ciphertexts for each request
- ✅ Handle encryption internally
- ✅ Register the secret if needed

### Scenario 2: Direct API Calls (Without SDK)
```bash
# .env
CIRCLE_ENTITY_SECRET=a1b2c3d4e5f6...  # Still needed to generate ciphertexts
CIRCLE_ENTITY_SECRET_CIPHERTEXT=eyJhbGc...  # Used for manual API calls
```

You would:
- Generate ciphertext before each API request
- Use the ciphertext in API request body
- Generate a new ciphertext for the next request

## Summary

| Variable | Required? | Used By | Purpose |
|----------|-----------|---------|---------|
| `CIRCLE_ENTITY_SECRET` | ✅ **YES** | SDK | SDK generates fresh ciphertexts automatically |
| `CIRCLE_ENTITY_SECRET_CIPHERTEXT` | ❌ Optional | Direct API calls | Only if making manual API calls (not using SDK) |

**Bottom Line**: Set `CIRCLE_ENTITY_SECRET` (unencrypted) in your `.env`. The SDK handles everything else automatically!

## Troubleshooting

### Error: "CIRCLE_ENTITY_SECRET must be set"
- **Cause**: You only have `CIRCLE_ENTITY_SECRET_CIPHERTEXT` set
- **Fix**: Add `CIRCLE_ENTITY_SECRET` with the unencrypted secret (64 hex chars)

### Error: "401 Invalid credentials"
- **Cause**: Entity secret not registered yet
- **Fix**: Run `ts-node test/register-entity-secret.ts` to register it

### Error: "Invalid format"
- **Cause**: Entity secret is not 64 hex characters
- **Fix**: Generate a new one: `ts-node test/generate-entity-secret.ts`

