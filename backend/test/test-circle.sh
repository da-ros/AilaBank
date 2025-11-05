#!/bin/bash

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="test-circle-$(date +%s)@gmail.com"
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
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi
echo "Token: ${TOKEN:0:20}..."
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Exiting."
  echo "Login response: $LOGIN_RESPONSE"
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
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Response: $(curl -s -X GET "$API_URL/api/v1/circle/wallet" -H "Authorization: Bearer $TOKEN")"
echo ""

# Step 5: Get balance
echo "5️⃣  Getting wallet balance..."
curl -s -X GET "$API_URL/api/v1/circle/wallet/balance" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Response: $(curl -s -X GET "$API_URL/api/v1/circle/wallet/balance" -H "Authorization: Bearer $TOKEN")"
echo ""

# Step 6: Create deposit address
echo "6️⃣  Creating deposit address..."
curl -s -X POST "$API_URL/api/v1/circle/wallet/deposit-address" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Response: $(curl -s -X POST "$API_URL/api/v1/circle/wallet/deposit-address" -H "Authorization: Bearer $TOKEN")"
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
echo ""
echo "📝 Note: Check server logs for transfer polling status updates"
echo "📝 Note: Transfer may fail if wallet has no balance (expected in sandbox)"

