# 🧪 Circle Integration Testing Guide

## Prerequisites

### 1. Set Up Circle API Keys

1. **Get Circle API Key**:
   - Sign up at https://console.circle.com
   - Create a developer account
   - Go to **Developer Services** → **API Keys** → **Create API Key**
   - **⚠️ Important**: Circle API keys must be in format: `TEST_API_KEY:key-id:key-secret`
   - Copy the entire API key (all three parts with colons)
   - **Important**: Use **Sandbox** environment for testing!
   - **Critical**: The API key MUST have **Developer Services** permissions (not just Payments/CCTP)

2. **Generate Entity Secret**:
   - **Option A: Using helper script** (recommended):
     ```bash
     cd backend
     ts-node test/generate-entity-secret.ts
     ```
     This will generate a new entity secret and display it. Copy it to your `.env` file.
   
   - **Option B: Using OpenSSL**:
     ```bash
     openssl rand -hex 32
     ```
     Copy the output and add it to your `.env` file as `CIRCLE_ENTITY_SECRET=<secret>`
   
   - **Important**: The entity secret must be 64 hex characters (32 bytes)

3. **Register Entity Secret** (REQUIRED before creating wallets):
   
   The SDK automatically handles encryption - you only need to provide the unencrypted secret.
   
   - **Option A: Using helper script** (recommended):
     ```bash
     cd backend
     ts-node test/register-entity-secret.ts [recovery-file-path]
     # Example: ts-node test/register-entity-secret.ts ./recovery-file.json
     ```
     This script will:
     - Read `CIRCLE_ENTITY_SECRET` and `CIRCLE_API_KEY` from `.env`
     - Register the entity secret with Circle
     - Save the recovery file (or return it in the response)
   
   - **Option B: Via API**:
     ```bash
     curl -X POST http://localhost:3000/api/v1/circle/register-entity-secret \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"recoveryFileDownloadPath": "./recovery-file.json"}'  # Optional
     ```
     Save the returned `recoveryFile` - you'll need it if you lose your entity secret!
   
   - **Option C: Via Circle Console**:
     - Go to Circle Console → Developer Services → Configuration
     - Click "Register Entity Secret Ciphertext"
     - Generate ciphertext using the SDK or manual encryption (see Circle docs)
   
   **⚠️ CRITICAL**: Save the recovery file securely! You'll need it to reset your entity secret if you lose it.

4. **Test SDK Connection** (recommended before proceeding):
   ```bash
   cd backend
   ts-node test/circle-sdk-connection-test.ts
   ```
   This will verify your API key and entity secret are correctly configured and registered.

2. **Get Webhook Secret** (optional for testing, required for production):
   - In Circle Console → **Webhooks** → **Settings**
   - Copy your webhook secret

3. **Add to `.env`**:
   ```bash
   # Format: TEST_API_KEY:key-id:key-secret
   # Example: TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d
   CIRCLE_API_KEY=TEST_API_KEY:your_key_id:your_key_secret
   CIRCLE_BASE_URL=https://api-sandbox.circle.com
   CIRCLE_WEBHOOK_SECRET=your_webhook_secret  # Optional for testing
   ```

### 2. Set Up Authentication

Circle endpoints require authentication. First, you need to:

1. **Set up Supabase** (if not already done):
   - See `SUPABASE_SETUP.md` for instructions
   - Add to `.env`:
     ```bash
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_KEY=your_service_key
     SUPABASE_ANON_KEY=your_anon_key
     ```

2. **Get Auth Token**:
   - Sign up a test user via `/api/v1/auth/signup`
   - Login via `/api/v1/auth/login`
   - Copy the `token` from the response

### 3. Start the Server

```bash
cd backend
npm run dev
```

---

## Step-by-Step Testing

### Step 1: Create a Test User & Get Auth Token

```bash
# Sign up a test user
# Note: Use a real email domain (not example.com) or disable email confirmation in Supabase
# See SUPABASE_AUTH_SETUP.md for details
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "testpassword123",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Login to get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "testpassword123"
  }'
```

**Save the token** from the login response (look for `token` or `accessToken` field) for the next steps:
```bash
export TOKEN="your_token_here"
```

---

### Step 2: Verify SDK Connection (Optional but Recommended)

Before registering, you can verify your SDK connection works:

```bash
curl -X GET http://localhost:3000/api/v1/circle/public-key \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "publicKey": "-----BEGIN RSA PUBLIC KEY-----\n...",
  "message": "Public key fetched successfully. This confirms your entity secret is registered and SDK is working.",
  "note": "If you see this, your SDK connection is working and entity secret is registered!"
}
```

**If you get 401**: Your entity secret isn't registered yet. Proceed to Step 3.

**If you get success**: Your SDK is working! You can proceed to wallet creation.

---

### Step 3: Register Entity Secret (REQUIRED - run once)

**⚠️ IMPORTANT**: You must register your entity secret BEFORE creating wallet sets or wallets!

```bash
curl -X POST http://localhost:3000/api/v1/circle/register-entity-secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Entity secret registered successfully!",
  "recoveryFile": { ... },
  "warning": "⚠️  Save the recovery file securely - you'll need it if you lose your entity secret!"
}
```

**⚠️ CRITICAL**: Save the `recoveryFile` in a secure location! You'll need it to recover your wallets if you lose your entity secret.

**What happens**:
- Encrypts your entity secret with Circle's public key
- Registers it with Circle's Developer Services
- Generates a recovery file for emergency access

---

### Step 3: Create a Wallet Set (run once)

```bash
curl -X POST http://localhost:3000/api/v1/circle/wallet-set/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aila Wallet Set"
  }'

# Copy the returned walletSet.id and add it to .env as CIRCLE_WALLET_SET_ID
```

**Expected Response**:
```json
{
  "success": true,
  "walletSet": {
    "id": "0189bc61-7fe4-70f3-8a1b-0d14426397cb",
    "custodyType": "DEVELOPER",
    "createDate": "2025-01-01T00:00:00Z"
  },
  "message": "Wallet set created. Update your environment with CIRCLE_WALLET_SET_ID to reuse it."
}
```

**What happens**:
- Encrypts the entity secret and creates a developer-controlled wallet set via Circle W3S API
- Logs the wallet set ID in the server output for convenience
- You must persist the ID (environment variable, config store, etc.)

---

### Step 4: Create a Circle Wallet

```bash
curl -X POST http://localhost:3000/api/v1/circle/wallet/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
```json
{
  "success": true,
  "wallet": {
    "id": "wallet-id-123",
    "state": "LIVE",
    "blockchain": "ETH-SEPOLIA"
  }
}
```

**What happens**:
- Creates a Circle developer-controlled wallet
- Stores `circle_wallet_id` in Supabase `users` table
- Returns wallet ID for future operations

---

### Step 5: Get Wallet Information

```bash
curl -X GET http://localhost:3000/api/v1/circle/wallet \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "wallet": {
    "id": "wallet-id-123",
    "balances": [
      {
        "amount": "0.00",
        "currency": "USD"
      }
    ],
    "state": "active"
  }
}
```

---

### Step 6: Check Wallet Balance

```bash
curl -X GET http://localhost:3000/api/v1/circle/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "balances": [
    {
      "amount": "0.00",
      "currency": "USD"
    }
  ]
}
```

**Note**: In sandbox, you may need to fund the wallet first. Check Circle Console for test funds.

---

### Step 7: Create Deposit Address (Not Yet Supported)

Developer-controlled wallets on the W3S API currently require different flows for deposit addresses.
This route will return a `400` error until Circle exposes deposit-address endpoints for developer-controlled wallets.
Use Circle's console faucets or transfers instead.

---

### Step 8: Transfer to Arc Chain

```bash
curl -X POST http://localhost:3000/api/v1/circle/transfer/arc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "10.00"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "transfer": {
    "id": "transfer-id-123",
    "status": "pending",
    "amount": "10.00",
    "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

**What happens**:
- Initiates transfer from Circle wallet to Arc chain
- Creates ledger entry in Supabase
- Starts background polling for transfer status
- Updates ledger when transfer completes

**Note**: 
- Transfer will be polled automatically (up to 30 attempts)
- If transfer fails, it will retry automatically (up to 3 times)
- Check logs to see polling status updates

---

### Step 9: Test Webhook (Optional)

Webhooks require a public URL. For local testing, use a tool like **ngrok**:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000
```

**Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

**Configure in Circle Console**:
1. Go to Circle Console → **Webhooks**
2. Add webhook URL: `https://abc123.ngrok.io/api/v1/circle/webhook`
3. Select notification types: `transfers`, `payments`, `wallets`
4. Copy the webhook secret to `.env` as `CIRCLE_WEBHOOK_SECRET`

**Test webhook** (Circle will send automatically when events occur):
```bash
# Webhook endpoint (no auth required, but signature verified)
curl -X POST http://localhost:3000/api/v1/circle/webhook \
  -H "Content-Type: application/json" \
  -H "circle-signature: sha256=..." \
  -d '{
    "notificationType": "transfers",
    "notification": {
      "id": "transfer-id-123",
      "status": "complete"
    }
  }'
```

---

## Complete Test Script

Create `test/test-circle.sh`:

```bash
#!/bin/bash

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="test-circle-$(date +%s)@example.com"
PASSWORD="testpassword123"
ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

echo "🧪 Testing Circle Integration"
echo "============================"
echo ""

# Step 1: Sign up
echo "1️⃣  Signing up test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"address\": \"$ADDRESS\"
  }")

echo "Signup response: $SIGNUP_RESPONSE"
echo ""

# Step 2: Login
echo "2️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Exiting."
  exit 1
fi

# Step 3: Create wallet
echo "3️⃣  Creating Circle wallet..."
WALLET_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/circle/wallet/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$ADDRESS\"}")

echo "Wallet response: $WALLET_RESPONSE"
echo ""

# Step 4: Get wallet
echo "4️⃣  Getting wallet info..."
curl -s -X GET "$API_URL/api/v1/circle/wallet" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Step 5: Get balance
echo "5️⃣  Getting wallet balance..."
curl -s -X GET "$API_URL/api/v1/circle/wallet/balance" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Step 6: Create deposit address
echo "6️⃣  Creating deposit address..."
curl -s -X POST "$API_URL/api/v1/circle/wallet/deposit-address" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Step 7: Transfer to Arc (will fail if no balance, but tests the endpoint)
echo "7️⃣  Testing transfer to Arc..."
TRANSFER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/circle/transfer/arc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"destinationAddress\": \"$ADDRESS\",
    \"amount\": \"1.00\"
  }")

echo "Transfer response: $TRANSFER_RESPONSE"
echo ""

echo "✅ Circle integration test complete!"
```

**Make it executable and run**:
```bash
chmod +x test/test-circle.sh
./test/test-circle.sh
```

---

## Testing with Postman/Thunder Client

### Import Collection

Create a collection with these requests:

1. **Sign Up**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/auth/signup`
   - Body:
     ```json
     {
       "email": "test@example.com",
       "password": "test123",
       "address": "0x..."
     }
     ```

2. **Login**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/auth/login`
   - Body:
     ```json
     {
       "email": "test@example.com",
       "password": "test123"
     }
     ```
   - **Save token** from response as environment variable `TOKEN`

3. **Create Wallet**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/circle/wallet/create`
   - Headers: `Authorization: Bearer {{TOKEN}}`
   - Body:
     ```json
     {
       "address": "0x..."
     }
     ```

4. **Get Wallet**
   - Method: `GET`
   - URL: `http://localhost:3000/api/v1/circle/wallet`
   - Headers: `Authorization: Bearer {{TOKEN}}`

5. **Get Balance**
   - Method: `GET`
   - URL: `http://localhost:3000/api/v1/circle/wallet/balance`
   - Headers: `Authorization: Bearer {{TOKEN}}`

6. **Transfer to Arc**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/circle/transfer/arc`
   - Headers: `Authorization: Bearer {{TOKEN}}`
   - Body:
     ```json
     {
       "destinationAddress": "0x...",
       "amount": "10.00"
     }
     ```

---

## Troubleshooting

### Error: "CIRCLE_API_KEY must be set in .env"
**Fix**: Make sure `.env` has `CIRCLE_API_KEY=...`

### Error: "malformed API key" or "API key should contain three substrings"
**Fix**: 
- Circle API keys must be in format: `TEST_API_KEY:key-id:key-secret`
- Make sure you copied the entire key (all three parts separated by colons)
- If your key doesn't have this format, create a new API key in Circle Console
- API keys generated after May 2023 use this format
- Example: `TEST_API_KEY:ebb3ad72232624921abc4b162148bb84:019ef3358ef9cd6d08fc32csfe89a68d`

### Error: "Invalid credentials" (401)
**Fix**: 
- Your API key format is correct, but authentication is failing
- **Check 1**: Verify the key values are correct (re-copy from Circle Console)
- **Check 2**: Make sure environment matches (TEST_API_KEY → sandbox, LIVE_API_KEY → production)
- **Check 3**: Verify the key is active in Circle Console (not revoked/expired)
- **Check 4**: Ensure the key has wallet permissions enabled
- **Check 5**: Try creating a fresh API key from Circle Console
- See `CIRCLE_INVALID_CREDENTIALS_FIX.md` for detailed troubleshooting

### Error: "Wallet not found"
**Fix**: Create a wallet first using `/api/v1/circle/wallet/create`

### Error: "Invalid or expired token"
**Fix**: 
- Login again to get a new token
- Check that Supabase auth is configured correctly

### Error: "Transfer validation failed"
**Possible causes**:
- Insufficient balance in wallet
- Invalid destination address
- Amount format incorrect (should be string like "10.00")

### Transfer Status Stuck on "pending"
**Normal behavior**:
- Transfers are polled automatically in the background
- Check server logs for polling status updates
- Transfer may take 1-5 minutes to complete
- If stuck > 10 minutes, check Circle Console for transfer status

### Webhook Signature Verification Failed
**Fix**:
- Make sure `CIRCLE_WEBHOOK_SECRET` is set in `.env`
- Verify signature format matches Circle's expected format
- In development, webhook verification is lenient (only warns)

### Circle API Rate Limits
**Sandbox limits**:
- Usually 100 requests/minute
- If you hit limits, wait a minute and retry

---

## Expected Test Results

### ✅ Successful Test Flow

1. **Sign up** → Returns user object with `id`
2. **Login** → Returns `token`
3. **Create wallet** → Returns wallet `id`, wallet created in Circle
4. **Get wallet** → Returns wallet with balances (may be empty initially)
5. **Get balance** → Returns balance array (may be `0.00`)
6. **Create deposit address** → Returns address and chain
7. **Transfer to Arc** → Returns transfer `id` and `status: "pending"`
   - Check server logs for polling updates
   - Transfer status should update to `completed` or `failed`

### 📊 Check Database

After testing, verify in Supabase:

```sql
-- Check user has wallet ID
SELECT id, email, circle_wallet_id FROM users WHERE email = 'test@example.com';

-- Check ledger entries
SELECT * FROM ledger WHERE user_id = 'user-id-here';

-- Check audit logs
SELECT * FROM audit_logs WHERE user_id = 'user-id-here' ORDER BY created_at DESC;
```

---

## Next Steps

After successful testing:

1. ✅ **Production Setup**:
   - Switch `CIRCLE_BASE_URL` to production
   - Set up production webhook URL
   - Configure webhook secret in production

2. ✅ **Fund Wallet**:
   - Use Circle Console to add test USDC to wallet
   - Test actual transfers

3. ✅ **Monitor Logs**:
   - Watch for polling status updates
   - Check for retry attempts
   - Verify webhook handling

4. ✅ **Integration Testing**:
   - Test end-to-end flow: Intent → Circle → Transfer
   - Test error scenarios (insufficient funds, invalid addresses)
   - Test retry logic

---

## Quick Reference

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | grep -oE '"token":"[^"]*|"accessToken":"[^"]*' | cut -d'"' -f4)

# Create wallet
curl -X POST http://localhost:3000/api/v1/circle/wallet/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x..."}'

# Get balance
curl -X GET http://localhost:3000/api/v1/circle/wallet/balance \
  -H "Authorization: Bearer $TOKEN"

# Transfer to Arc
curl -X POST http://localhost:3000/api/v1/circle/transfer/arc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"destinationAddress":"0x...","amount":"10.00"}'
```

Happy testing! 🚀

