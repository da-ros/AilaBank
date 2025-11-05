# 💳 Circle Integration Guide

## Overview

Circle integration is now complete! This allows AilaBank to:
- Create developer-controlled wallets for users
- Check wallet balances
- Transfer USDC to Arc chain
- Handle webhooks for real-time updates
- Store wallet information in Supabase

## API Endpoints

### Wallet Operations

#### `GET /api/v1/circle/wallet`
Get user's Circle wallet information
- **Auth**: Required
- **Response**:
```json
{
  "success": true,
  "wallet": {
    "id": "wallet-id",
    "balances": [...],
    "state": "active"
  }
}
```

#### `POST /api/v1/circle/wallet/create`
Create a new Circle wallet for authenticated user
- **Auth**: Required
- **Body**: `{ "address": "0x..." }` (optional - uses user's address if not provided)
- **Response**:
```json
{
  "success": true,
  "wallet": {
    "id": "wallet-id",
    "state": "active"
  }
}
```

#### `GET /api/v1/circle/wallet/balance`
Get wallet balance
- **Auth**: Required
- **Response**:
```json
{
  "success": true,
  "balances": [
    {
      "amount": "100.00",
      "currency": "USD"
    }
  ]
}
```

#### `POST /api/v1/circle/wallet/deposit-address`
Create a deposit address for user wallet
- **Auth**: Required
- **Response**:
```json
{
  "success": true,
  "address": "0x...",
  "chain": "ETH"
}
```

### Transfer Operations

#### `POST /api/v1/circle/transfer/arc`
Transfer USDC from Circle wallet to Arc chain
- **Auth**: Required
- **Body**:
```json
{
  "destinationAddress": "0x...",
  "amount": "100.00"
}
```
- **Response**:
```json
{
  "success": true,
  "transfer": {
    "id": "transfer-id",
    "status": "pending",
    "amount": "100.00",
    "destination": "0x..."
  }
}
```

### Webhooks

#### `POST /api/v1/circle/webhook`
Handle Circle webhook notifications
- **Auth**: None (public endpoint, but should verify signature)
- **Headers**: `circle-signature` (webhook signature)
- **Body**: Circle webhook payload
- **Response**: Always returns `200 OK` to acknowledge receipt

## Environment Variables

Add to your `.env` file:

```bash
# Circle API Configuration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret  # Required for developer-controlled wallets
CIRCLE_WALLET_SET_ID=your_wallet_set_id  # Set after creating a wallet set
CIRCLE_WALLET_BLOCKCHAINS=ETH-SEPOLIA  # Comma-separated chains for new wallets
CIRCLE_WALLET_ACCOUNT_TYPE=SCA  # SCA (smart contract account) or EOA
CIRCLE_WALLET_COUNT=1  # Number of wallets to create per request (1-20)
CIRCLE_BASE_URL=https://api-sandbox.circle.com  # Use sandbox for testing
CIRCLE_WEBHOOK_SECRET=your_webhook_secret  # Required for webhook signature verification
```

## Database Integration

The Circle service automatically:
- Stores `circle_wallet_id` in the `users` table when a wallet is created
- Creates ledger entries for transfers
- Updates ledger status when webhooks are received
- Creates audit logs for all wallet operations

## Webhook Setup

1. **Configure webhook in Circle Dashboard**:
   - Go to Circle Console → Webhooks
   - Add webhook URL: `https://your-domain.com/api/v1/circle/webhook`
   - Select notification types: `transfers`, `payments`, `wallets`

2. **Verify webhook signature** (TODO):
   - Currently, webhook signature verification is a placeholder
   - Implement HMAC-SHA256 verification using Circle's webhook secret
   - Add `CIRCLE_WEBHOOK_SECRET` to `.env`

## Usage Examples

### Register Entity Secret (REQUIRED - run once)

**⚠️ IMPORTANT**: You must register your entity secret BEFORE creating any wallets or wallet sets!

```bash
curl -X POST http://localhost:3000/api/v1/circle/register-entity-secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Save the returned recoveryFile - you'll need it if you lose your entity secret!
```

**Alternative**: Use Circle Console → Developer Services → Configuration → Register Entity Secret

### Create a Wallet Set (run once per environment)

```bash
curl -X POST http://localhost:3000/api/v1/circle/wallet-set/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Aila Wallet Set"}'

# Copy the returned walletSet.id into .env as CIRCLE_WALLET_SET_ID
```

### Create Wallet for New User

```typescript
// After user signs up (wallet set must already exist)
const response = await fetch('/api/v1/circle/wallet/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  // Body is optional for developer-controlled wallets; address is assigned by Circle
  body: JSON.stringify({})
});
```

### Transfer to Arc

```typescript
const response = await fetch('/api/v1/circle/transfer/arc', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    destinationAddress: arcContractAddress,
    amount: '100.00'
  })
});
```

## Error Handling

All endpoints return structured error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Wallet not found
- `401 Unauthorized`: Missing or invalid authentication

## Notes

1. **Arc Chain Support**: ✅ Arc is Circle's own blockchain, so it's fully supported! The implementation uses `'ARC'` as the chain identifier for transfers.

2. **Idempotency**: All Circle API calls use UUID-based idempotency keys to prevent duplicate operations.

3. **Response Structure**: The Circle SDK response structure may vary. The service handles multiple possible response formats automatically.

4. **Testing**: Use Circle's sandbox environment for development. Switch to production when ready.

## Features Implemented

1. ✅ Wallet creation and management
2. ✅ Balance checking
3. ✅ Transfer to Arc (native support)
4. ✅ Webhook handling
5. ✅ Webhook signature verification (HMAC-SHA256)
6. ✅ Transfer status polling with exponential backoff
7. ✅ Retry logic for failed transfers (3 attempts with exponential backoff)

## Additional Features

### Transfer Status Polling

Transfers are automatically polled in the background after initiation:
- **Max retries**: 30 attempts
- **Initial delay**: 2 seconds
- **Exponential backoff**: Up to 30 seconds between polls
- **Status updates**: Automatically updates ledger when transfer completes

### Retry Logic

Failed transfers are automatically retried:
- **Max retries**: 3 attempts
- **Initial delay**: 5 seconds
- **Exponential backoff**: Up to 60 seconds between retries
- **Retry conditions**: Only retries on temporary errors (5xx, connection issues)

