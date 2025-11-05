#!/bin/bash

# AilaBank Intent API Test Script
# Tests the /api/v1/intent endpoint with text input

API_URL="${API_URL:-http://localhost:3000}"
USER_ID="${USER_ID:-test-user-123}"

echo "🧪 Testing AilaBank Intent API"
echo "API URL: $API_URL"
echo "═══════════════════════════════════════════════════"

# Test 1: Simple deposit intent
echo ""
echo "📝 Test 1: Deposit Intent"
echo "───────────────────────────────────────────────────"
curl -X POST "$API_URL/api/v1/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"text\": \"Deposit 100 USDC\"
  }" | jq '.'

# Wait a bit to avoid rate limits
sleep 2

# Test 2: Withdraw intent
echo ""
echo "📝 Test 2: Withdraw Intent"
echo "───────────────────────────────────────────────────"
curl -X POST "$API_URL/api/v1/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"text\": \"Withdraw 50 dollars\"
  }" | jq '.'

sleep 2

# Test 3: Transfer intent
echo ""
echo "📝 Test 3: Transfer Intent"
echo "───────────────────────────────────────────────────"
curl -X POST "$API_URL/api/v1/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"text\": \"Transfer 25 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\"
  }" | jq '.'

sleep 2

# Test 4: Balance check
echo ""
echo "📝 Test 4: Balance Check"
echo "───────────────────────────────────────────────────"
curl -X POST "$API_URL/api/v1/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"text\": \"What's my balance?\"
  }" | jq '.'

sleep 2

# Test 5: Complex policy update
echo ""
echo "📝 Test 5: Policy Update"
echo "───────────────────────────────────────────────────"
curl -X POST "$API_URL/api/v1/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"text\": \"Move 35% of idle cash to safest yield, keep $1k liquid\"
  }" | jq '.'

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ All API tests completed!"
echo ""
echo "💡 Tip: To test with audio, use:"
echo "   curl -X POST $API_URL/api/v1/intent \\"
echo "     -F \"audio=@your-recording.webm\" \\"
echo "     -F \"userId=$USER_ID\""

