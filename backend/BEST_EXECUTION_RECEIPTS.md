# 📋 Best-Rate Guarantee & Proof-of-Best-Execution

## Overview

The Best-Execution Receipt system provides immutable proof that we executed transfers at the best available rate. Each receipt includes the complete quote set, chosen route, FX details, fees breakdown, and an on-chain anchor for verifiability.

## Features

- ✅ **Complete Quote Set**: All quotes considered from all providers
- ✅ **Route Selection**: Chosen route with alternatives and policy evaluation
- ✅ **FX Details**: Exchange rate, spread, and conversion details
- ✅ **Fees Breakdown**: Complete breakdown of all fees (FX + route)
- ✅ **Spread Analysis**: Spread comparison and market rate analysis
- ✅ **On-Chain Anchor**: Keccak256 hash anchored on Arc blockchain
- ✅ **Immutable Storage**: Receipts stored in database with hash verification

## API Endpoints

### Create Best-Execution Receipt

```bash
POST /api/v1/receipts/best-exec
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "from": "EUR",
  "to": "USD",
  "amount": 1000,
  "corridor": "EUR-US"
}
```

**Response:**
```json
{
  "success": true,
  "receipt": {
    "receiptId": "uuid-here",
    "userId": "user-id",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "quoteSet": {
      "quotes": [
        {
          "quoteId": "quote-1",
          "from": "EUR",
          "to": "USD",
          "amount": 1000,
          "rate": 1.082,
          "totalAmount": 1081.39,
          "spread": 0.5,
          "provider": "mock"
        }
      ],
      "bestQuote": { /* best quote object */ },
      "comparison": {
        "providerCount": 2,
        "priceRange": {
          "min": 1080.50,
          "max": 1082.00,
          "best": 1081.39
        },
        "spreadRange": {
          "min": 0.3,
          "max": 0.5,
          "best": 0.5
        }
      }
    },
    "chosenRoute": {
      "routeId": "route-uuid",
      "corridor": "EUR-US",
      "psp": {
        "id": "reliableroute",
        "name": "ReliableRoute"
      },
      "cost": 18,
      "speed": 150,
      "reliability": 0.98,
      "score": 0.85,
      "alternatives": [
        {
          "routeId": "alt-1",
          "psp": "FastPay",
          "cost": 25,
          "score": 0.82
        }
      ],
      "policyEvaluation": {
        "passed": true,
        "complianceLevel": "high",
        "constraints": ["KYC verification required", "Travel Rule compliance required"]
      }
    },
    "fx": {
      "from": "EUR",
      "to": "USD",
      "amount": 1000,
      "rate": 1.082,
      "convertedAmount": 1082,
      "spread": 0.5,
      "provider": "mock",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    "fees": {
      "fx": {
        "provider": 1.082,
        "network": 0.5,
        "total": 1.582
      },
      "route": {
        "psp": 18,
        "total": 18
      },
      "total": 19.582,
      "breakdown": [
        {
          "type": "fx_provider",
          "description": "FX provider fee (mock)",
          "amount": 1.082
        },
        {
          "type": "fx_network",
          "description": "Network fee",
          "amount": 0.5
        },
        {
          "type": "psp",
          "description": "PSP fee (ReliableRoute)",
          "amount": 18
        }
      ]
    },
    "spread": {
      "fxSpread": 0.5,
      "routeSpread": 0,
      "totalSpread": 0.5,
      "comparison": {
        "ourRate": 1.082,
        "difference": 0,
        "differencePercent": 0
      }
    },
    "onChainAnchor": {
      "txHash": "0x...",
      "blockNumber": 123456,
      "blockTimestamp": "2024-01-01T12:00:05.000Z",
      "receiptHash": "0x...",
      "contractAddress": "0x...",
      "eventName": "BestExecReceipt",
      "chainId": 12345
    },
    "metadata": {
      "version": "1.0.0",
      "generatedAt": "2024-01-01T12:00:00.000Z",
      "source": "ailabank-backend"
    }
  }
}
```

### Get Receipt by ID

```bash
GET /api/v1/receipts/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "receipt": { /* receipt object */ }
}
```

### Get User Receipts

```bash
GET /api/v1/receipts?limit=50
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "receipts": [ /* array of receipts */ ],
  "count": 10
}
```

## Receipt Structure

### Quote Set
- **quotes**: All quotes from all providers
- **bestQuote**: The best quote selected
- **comparison**: Price and spread ranges for transparency

### Chosen Route
- **routeId**: Unique route identifier
- **psp**: Selected PSP provider
- **cost, speed, reliability**: Route metrics
- **score**: Overall route score
- **alternatives**: Backup routes considered
- **policyEvaluation**: Compliance evaluation results

### FX Snapshot
- **from/to**: Currency pair
- **rate**: Exchange rate used
- **spread**: Spread percentage
- **provider**: FX provider used
- **timestamp**: When quote was generated

### Fees Breakdown
- **fx**: FX-related fees (provider + network)
- **route**: Route/PSP fees
- **total**: All fees combined
- **breakdown**: Itemized fee list

### Spread Breakdown
- **fxSpread**: FX spread percentage
- **routeSpread**: Route spread (implicit)
- **totalSpread**: Combined spread
- **comparison**: Comparison with market rate (if available)

### On-Chain Anchor
- **txHash**: Transaction hash on Arc blockchain
- **blockNumber**: Block number
- **receiptHash**: Keccak256 hash of receipt JSON
- **contractAddress**: Contract that emitted the event
- **eventName**: Event name (BestExecReceipt)
- **chainId**: Arc chain ID

## On-Chain Anchoring

### Current Implementation (Mock)

The current implementation generates a mock on-chain anchor for development. In production, this would:

1. **Generate Receipt Hash**: Keccak256 hash of the canonical JSON receipt
2. **Call Smart Contract**: Emit `BestExecReceipt` event with hash
3. **Wait for Confirmation**: Wait for transaction to be mined
4. **Store Anchor**: Store txHash, blockNumber, and contract address

### Production Implementation

To implement real on-chain anchoring:

1. Deploy `BestExecReceipt` contract on Arc
2. Set `BEST_EXEC_CONTRACT_ADDRESS` in `.env`
3. Set `ARC_CHAIN_ID` in `.env`
4. Update `anchorOnChain()` method to use ethers.js
5. Connect to Arc network and call contract method

**Example Contract Method:**
```solidity
event BestExecReceipt(
    bytes32 indexed receiptHash,
    address indexed user,
    uint256 timestamp
);

function anchorReceipt(bytes32 receiptHash) external {
    emit BestExecReceipt(receiptHash, msg.sender, block.timestamp);
}
```

## Database Schema

Receipts are stored in the `receipts` table:

```sql
CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    receipt_data JSONB NOT NULL,
    receipt_hash VARCHAR(66) NOT NULL,
    on_chain_tx_hash VARCHAR(66),
    on_chain_block_number BIGINT,
    on_chain_contract_address VARCHAR(42),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing

### Create Receipt

```bash
curl -X POST http://localhost:3000/api/v1/receipts/best-exec \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EUR",
    "to": "USD",
    "amount": 1000,
    "corridor": "EUR-US"
  }'
```

### Get Receipt

```bash
curl http://localhost:3000/api/v1/receipts/{receipt-id} \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Receipts

```bash
curl "http://localhost:3000/api/v1/receipts?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Verification

### Verify Receipt Hash

The receipt hash is a Keccak256 hash of the canonical JSON representation. To verify:

1. Get receipt from API
2. Remove `onChainAnchor` field (it's added after hash generation)
3. Sort JSON keys alphabetically
4. Generate SHA-256 hash (or Keccak256 in production)
5. Compare with `receiptHash` in database

### Verify On-Chain Anchor

1. Get `on_chain_tx_hash` from receipt
2. Query Arc blockchain for transaction
3. Verify event was emitted with correct `receiptHash`
4. Verify `blockNumber` matches

## Use Cases

### Best-Rate Guarantee

The receipt proves:
- All available quotes were considered
- Best quote was selected
- Route was chosen based on scoring
- Complete fee transparency

### Audit Trail

Receipts provide:
- Immutable record of execution
- On-chain proof for verification
- Complete fee breakdown
- Policy compliance evidence

### Dispute Resolution

If a user disputes execution:
- Receipt shows all quotes considered
- Route selection rationale
- Complete fee breakdown
- On-chain proof of execution

## Future Enhancements

- [ ] Real on-chain anchoring via Arc smart contract
- [ ] Market rate comparison (real-time)
- [ ] Receipt verification API endpoint
- [ ] Receipt export (PDF, JSON)
- [ ] Receipt sharing (public links)
- [ ] Historical receipt analytics
- [ ] Receipt search and filtering

