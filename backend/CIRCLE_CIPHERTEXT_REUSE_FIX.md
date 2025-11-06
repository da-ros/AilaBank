# 🔄 Fixing Entity Secret Ciphertext Reuse Error (Code 156004)

## The Problem

When creating wallets, you might get this error:

```json
{
  "code": 156004,
  "message": "Reusing an entity secret ciphertext is not allowed. Please re-encrypt the entity secret to generate new ciphertext."
}
```

## Why This Happens

According to Circle's documentation, **each API request must use a fresh ciphertext**. This is a security requirement:
- Each ciphertext can only be used **once**
- Circle requires fresh encryption for every request
- Reusing the same ciphertext will be rejected

## How the SDK Should Handle This

The `@circle-fin/developer-controlled-wallets` SDK **should automatically**:
1. Generate a fresh ciphertext for each API request
2. Encrypt the entity secret using Circle's public key
3. Include the fresh ciphertext in the request

**You don't need to manually generate ciphertexts** - the SDK handles this internally.

## If You're Getting This Error with the SDK

If you're still getting the ciphertext reuse error even when using the SDK, it might indicate:

1. **SDK Bug**: The SDK might not be generating fresh ciphertexts properly
2. **Caching Issue**: The SDK client might be caching ciphertexts
3. **SDK Version**: You might be using an outdated SDK version

### Solutions

#### Solution 1: Verify SDK Client Initialization

Make sure your SDK client is initialized with the **unencrypted** entity secret:

```typescript
const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,  // Unencrypted, 64 hex chars
  baseUrl: 'https://api-sandbox.circle.com'  // For sandbox
});
```

The SDK will automatically generate fresh ciphertexts from this unencrypted secret.

#### Solution 2: Restart the Server

Sometimes the SDK client might cache state. Try:
```bash
# Stop the server
# Restart it
npm run dev
```

#### Solution 3: Create New Client Instance (If Needed)

If the SDK is caching ciphertexts, you might need to create a new client instance for each request:

```typescript
// In circleService.ts, instead of reusing this.dcWalletClient,
// create a new instance for each request (not recommended, but might help)
```

#### Solution 4: Update SDK Version

Make sure you're using the latest SDK:
```bash
npm install @circle-fin/developer-controlled-wallets@latest
```

#### Solution 5: Test Ciphertext Generation

Use the test endpoint to verify ciphertext generation works:

```bash
curl -X GET http://localhost:3000/api/v1/circle/generate-ciphertext \
  -H "Authorization: Bearer $TOKEN"
```

Call it multiple times - each call should return a **different** ciphertext.

## Manual Workaround (Not Recommended)

If the SDK isn't working correctly, you could manually generate ciphertexts, but this is **not recommended**:

1. Get the public key:
   ```bash
   curl -X GET http://localhost:3000/api/v1/circle/public-key \
     -H "Authorization: Bearer $TOKEN"
   ```

2. Generate ciphertext manually (using RSA encryption)
3. Use it in your API request
4. **Generate a new one for the next request**

But this defeats the purpose of using the SDK. The SDK should handle this automatically.

## Debugging

### Check if SDK is Generating Fresh Ciphertexts

1. Call the generate-ciphertext endpoint multiple times:
   ```bash
   curl -X GET http://localhost:3000/api/v1/circle/generate-ciphertext \
     -H "Authorization: Bearer $TOKEN"
   ```

2. Each response should have a **different** ciphertext

3. If they're the same, the SDK has a bug

### Check SDK Client Configuration

Verify in your logs that:
- `CIRCLE_ENTITY_SECRET` is set (unencrypted, 64 hex chars)
- SDK client is initialized with `entitySecret` (not `entitySecretCiphertext`)
- Base URL matches your environment

## Expected Behavior

When using the SDK's `createWallets()` method:
- ✅ SDK automatically fetches public key (if needed)
- ✅ SDK encrypts entity secret to generate fresh ciphertext
- ✅ SDK includes ciphertext in API request
- ✅ Each request gets a new ciphertext

**You should NOT need to manually generate ciphertexts** when using the SDK.

## If Nothing Works

If you've tried all the above and still get the error:

1. **Contact Circle Support**: There might be an SDK bug
2. **Check Circle's GitHub**: Look for known issues
3. **Use Direct API Calls**: As a temporary workaround, make direct API calls with manually generated ciphertexts (but you'll need to generate a new one for each request)

## Summary

- The SDK **should** handle fresh ciphertext generation automatically
- If you get error 156004, the SDK might not be working correctly
- Try restarting the server, updating the SDK, or creating new client instances
- Test ciphertext generation to verify it's working
- If all else fails, contact Circle support

