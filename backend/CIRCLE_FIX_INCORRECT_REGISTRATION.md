# 🔧 Fixing Incorrect Entity Secret Registration

## Problem

You registered an entity secret ciphertext that was:
- Generated with a **malformed public key**
- Generated from a **different hex-encoded entity secret** than what you're using now
- Registered incorrectly via Circle Console

Now you're getting **401 errors** and can't rotate it in the Circle Console.

## Solution: Register a New Entity Secret

The good news: **The SDK's `registerEntitySecretCiphertext` function will overwrite the old registration** when you call it with a new unencrypted entity secret.

### Step 1: Generate a New Entity Secret

```bash
cd backend
ts-node test/generate-entity-secret.ts
```

**Copy the output** - this is your new unencrypted entity secret.

### Step 2: Update .env

```bash
# Remove or comment out the old CIRCLE_ENTITY_SECRET_CIPHERTEXT
# CIRCLE_ENTITY_SECRET_CIPHERTEXT=...  # OLD - IGNORE THIS

# Add the NEW unencrypted secret
CIRCLE_ENTITY_SECRET=your_new_generated_secret_here
```

### Step 3: Register the New Entity Secret

**Option A: Using the helper script** (recommended):
```bash
ts-node test/register-entity-secret.ts
```

**Option B: Using the API**:
```bash
curl -X POST http://localhost:3000/api/v1/circle/register-entity-secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Step 4: Verify It Works

```bash
curl -X GET http://localhost:3000/api/v1/circle/public-key \
  -H "Authorization: Bearer $TOKEN"
```

If you get a successful response with a public key, the new registration worked!

## Why This Works

When you call `registerEntitySecretCiphertext` with the SDK:
1. The SDK encrypts your unencrypted secret using Circle's current public key
2. It sends the newly encrypted ciphertext to Circle
3. Circle **overwrites** the old registration with the new one

You don't need the old incorrect ciphertext - just provide the new unencrypted secret.

## If Registration Still Fails

If you still get 401 errors after registering a new entity secret:

1. **Verify API Key**: Make sure your API key is correct and has Developer Services permissions
2. **Check Environment**: Ensure you're using the right environment (sandbox vs production)
3. **Try Different Entity Secret**: Generate a completely different entity secret and try again
4. **Contact Circle Support**: If nothing works, you may need to contact Circle support to manually clear the old registration

## Important Notes

- **The old incorrect ciphertext is no longer needed** - you can ignore `CIRCLE_ENTITY_SECRET_CIPHERTEXT`
- **Only set `CIRCLE_ENTITY_SECRET`** (the unencrypted version) in your `.env`
- **Save the recovery file** from the registration response - you'll need it if you lose the entity secret again
- **Each API request needs a fresh ciphertext** - the SDK handles this automatically

## Prevention

To avoid this issue in the future:
- ✅ **Use the SDK** for registration (it handles encryption automatically)
- ✅ **Don't manually encrypt** the entity secret unless you know what you're doing
- ✅ **Use the helper scripts** (`generate-entity-secret.ts` and `register-entity-secret.ts`)
- ❌ **Don't manually create ciphertext** unless you're making direct API calls (not using SDK)

## Summary

1. Generate new entity secret
2. Set `CIRCLE_ENTITY_SECRET` in `.env` (unencrypted)
3. Register it via SDK
4. Old incorrect registration will be overwritten
5. You're good to go! 🎉

