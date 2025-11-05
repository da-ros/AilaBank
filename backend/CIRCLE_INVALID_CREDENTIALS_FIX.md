# 🔐 Circle "Invalid Credentials" Error Fix

## Problem: 401 "Invalid credentials" Error

If you see this error:
```
❌ Wallet creation failed: { code: 401, message: 'Invalid credentials.' }
```

This could mean:
1. **Circle API key is invalid** (most common)
2. **User authentication token is invalid/expired** (check server logs)
3. **Environment mismatch** (sandbox vs production)

Check your server logs to see which one:
- If you see `✅ User authenticated: ...` → User auth is fine, issue is with Circle API key
- If you see `❌ Auth verification failed: ...` → User auth is the problem

## Common Causes & Solutions

### 0. ✅ Check User Authentication (First!)

**Problem**: Your Supabase auth token might be invalid or expired.

**Check server logs** - you should see:
```
✅ User authenticated: user-id-123 (user@example.com)
📝 Wallet creation request - User ID: user-id-123, Email: user@example.com
```

If you see `❌ Auth verification failed` instead, the issue is with user authentication:

**Solution**:
1. **Re-login** to get a fresh token:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"yourpassword"}'
   ```
2. **Copy the new token** from the response
3. **Use it in your request**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/circle/wallet/create \
     -H "Authorization: Bearer NEW_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### 0.5. ✅ Test API Key Directly

**Quick test script** to verify your API key works:

```bash
cd backend
ts-node test/circle-api-key-test.ts
```

This will test your API key independently and show exactly what Circle returns.

### 1. ✅ Check API Key Values

**Problem**: The key format is correct, but the actual values are wrong.

**Solution**:
1. Go to https://console.circle.com
2. Navigate to **API Keys**
3. Find your API key (or create a new one)
4. **Copy the ENTIRE key** - make sure you get all three parts:
   - `TEST_API_KEY:key-id:key-secret`
5. Double-check for:
   - No extra spaces
   - No missing characters
   - All three parts present

### 2. ✅ Verify Environment Match

**Problem**: Using a production key with sandbox or vice versa.

**Check**:
- If your key starts with `TEST_API_KEY` → Use sandbox
- If your key starts with `LIVE_API_KEY` → Use production

**Solution**:
```bash
# For sandbox testing, make sure your key starts with TEST_API_KEY
CIRCLE_API_KEY=TEST_API_KEY:your_key_id:your_key_secret
CIRCLE_BASE_URL=https://api-sandbox.circle.com
```

### 3. ✅ Verify API Key is Active

**Problem**: API key might be revoked, expired, or inactive.

**Solution**:
1. Go to Circle Console → **API Keys**
2. Check if your key shows as **Active**
3. If it's revoked or inactive, create a new one

### 4. ✅ Check API Key Permissions

**Problem**: API key might not have wallet creation permissions.

**Solution**:
1. Go to Circle Console → **API Keys**
2. Check your key's permissions
3. Make sure it has **Wallet** permissions enabled
4. If needed, create a new key with full permissions

### 5. ✅ Verify Account Status

**Problem**: Your Circle account might be in a restricted state.

**Solution**:
1. Check Circle Console dashboard
2. Verify your account is active
3. Complete any required verification steps
4. Check for any account warnings or restrictions
5. **Important**: Some Circle accounts require KYC/verification before creating wallets
6. Check if there's a "Verify Account" or "Complete Setup" step in Circle Console

### 6. ✅ Check Entity/Organization Setup

**Problem**: Circle might require an Entity to be set up before creating wallets.

**Solution**:
1. Go to Circle Console → **Entities** (or **Organization**)
2. Check if you need to create or verify an Entity
3. Some operations require an Entity ID
4. If you have `CIRCLE_ENTITY_SECRET`, it might be needed for wallet creation

### 7. ✅ Use the W3S Developer Wallet Endpoints

**Problem**: The legacy `/v1/wallets` path (used by the general Circle SDK) does not work for developer-controlled wallets.

**Solution**:
1. Create a wallet set first:
   ```bash
   curl -X POST https://api-sandbox.circle.com/v1/w3s/developer/walletSets \
     -H "Authorization: Bearer $CIRCLE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "idempotencyKey": "uuid",
       "entitySecretCiphertext": "...",
       "name": "My Wallet Set"
     }'
   ```
2. Store the returned `walletSetId` (set `CIRCLE_WALLET_SET_ID`)
3. Call the wallet endpoint:
   ```bash
   POST /v1/w3s/developer/wallets
   {
     "idempotencyKey": "uuid",
     "entitySecretCiphertext": "...",
     "walletSetId": "...",
     "blockchains": ["ETH-SEPOLIA"],
     "count": 1,
     "accountType": "SCA"
   }
   ```
4. Our backend now uses these W3S endpoints internally; make sure your env vars include `CIRCLE_WALLET_SET_ID`, `CIRCLE_WALLET_BLOCKCHAINS`, etc.

## Step-by-Step Debugging

### Step 1: Verify Your API Key Format

```bash
# Check your .env file
cat backend/.env | grep CIRCLE_API_KEY

# Should look like:
# CIRCLE_API_KEY=TEST_API_KEY:abc123...:xyz789...
```

Count the parts:
- ✅ Should have **2 colons** (`:`)
- ✅ Should have **3 parts** total
- ✅ First part should be `TEST_API_KEY` or `LIVE_API_KEY`

### Step 2: Test API Key Directly

You can test your API key with a simple curl command:

```bash
# Replace with your actual API key
API_KEY="TEST_API_KEY:your_key_id:your_key_secret"

# Test sandbox
curl -X GET "https://api-sandbox.circle.com/v1/wallets" \
  -H "Authorization: Bearer $API_KEY"

# If you get 401, the key is invalid
# If you get 200 or 404, the key works (404 is normal if no wallets exist)
```

### Step 3: Check Server Logs

When you start your server, you should see:
```
🔑 Circle SDK initialized: sandbox environment
   API Key: TEST_API_KEY:xxxx...
```

If you see this, the format is correct. If you still get 401 errors, the key values are wrong.

### Step 4: Create a Fresh API Key

If nothing works, create a new API key:

1. **Go to Circle Console**: https://console.circle.com
2. **Navigate to**: API Keys → Create API Key
3. **Select**: Sandbox (for testing)
4. **Copy the ENTIRE key** immediately (you can't see it again!)
5. **Update `.env`**:
   ```bash
   CIRCLE_API_KEY=TEST_API_KEY:new_key_id:new_key_secret
   ```
6. **Restart your server**

## Quick Fix Checklist

- [ ] API key format has 3 parts separated by colons
- [ ] First part is `TEST_API_KEY` (for sandbox) or `LIVE_API_KEY` (for production)
- [ ] No extra spaces before/after the key
- [ ] Key is active in Circle Console
- [ ] Environment matches (sandbox key → sandbox API)
- [ ] Server restarted after updating `.env`
- [ ] Verified key is correct in Circle Console

## Still Having Issues?

1. **Double-check in Circle Console**:
   - Go to API Keys
   - Verify the key you're using exists
   - Check if it's active/enabled

2. **Try creating a new key**:
   - Delete old key (if safe)
   - Create fresh key
   - Copy immediately
   - Update `.env`
   - Restart server

3. **Check Circle documentation**:
   - https://developers.circle.com/docs
   - Verify latest API key requirements

4. **Contact Circle Support**:
   - If account is verified and key format is correct
   - They can help verify key status

---

**Remember**: API keys are sensitive! Never commit them to git or share them publicly.

