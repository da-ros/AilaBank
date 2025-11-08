# 🛣️ Corridor Router and Off-Ramps Service

## Overview

The Corridor Router service provides intelligent routing for cross-border payments with policy evaluation, multiple PSP (Payment Service Provider) adapters, route scoring, and failover logic.

## Features

- ✅ **Policy Packs**: KYC/KYB, sanctions, Travel-Rule compliance per corridor
- ✅ **Multiple PSP Adapters**: 3 mock adapters (FastPay, CheapTransfer, ReliableRoute)
- ✅ **Route Scoring**: Weighted scoring based on cost (40%), speed (30%), reliability (30%)
- ✅ **Failover Logic**: Automatic selection of alternative routes if primary fails
- ✅ **Policy Evaluation**: Real-time compliance checking with detailed evaluation results
- ✅ **FX Integration**: Automatic FX quote fetching when currency conversion is needed

## API Endpoints

### Choose Route

```bash
POST /api/v1/route/choose
```

**Request Body:**
```json
{
  "from": "EUR",
  "to": "USD",
  "amount": 1000,
  "corridor": "EUR-US",
  "userId": "optional-user-id",
  "metadata": {
    "purpose": "Payment for services",
    "recipientInfo": {
      "name": "John Doe",
      "accountNumber": "123456789",
      "country": "US"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "route": {
    "routeId": "uuid-here",
    "corridor": "EUR-US",
    "from": "EUR",
    "to": "USD",
    "amount": 1000,
    "selectedRoute": {
      "routeId": "uuid-here",
      "psp": {
        "id": "reliableroute",
        "name": "ReliableRoute"
      },
      "cost": 18,
      "speed": 150,
      "reliability": 0.98,
      "score": 0.85,
      "metadata": {
        "provider": "ReliableRoute",
        "method": "bank_transfer",
        "estimatedDelivery": 150,
        "minAmount": 50,
        "maxAmount": 75000,
        "supportedCurrencies": ["USD", "EUR", "GBP", "USDC"]
      }
    },
    "alternativeRoutes": [
      {
        "routeId": "uuid-here",
        "psp": {
          "id": "fastpay",
          "name": "FastPay"
        },
        "cost": 25,
        "speed": 90,
        "reliability": 0.95,
        "score": 0.82
      }
    ],
    "policyEvaluation": {
      "passed": true,
      "kycRequired": true,
      "kybRequired": false,
      "sanctionsCheck": {
        "required": true,
        "passed": true,
        "reason": "Sanctions check passed"
      },
      "travelRule": {
        "required": true,
        "passed": true,
        "payload": {
          "originator": {
            "name": "User",
            "country": "US"
          },
          "beneficiary": {
            "name": "John Doe",
            "accountNumber": "123456789",
            "country": "US"
          },
          "transaction": {
            "amount": 1000,
            "currency": "USD",
            "reference": "uuid-here"
          },
          "timestamp": "2024-01-01T12:00:00.000Z"
        }
      },
      "complianceLevel": "high",
      "constraints": [
        "Minimum amount: 100",
        "Maximum amount: 100000",
        "KYC verification required",
        "Travel Rule compliance required"
      ],
      "warnings": [],
      "errors": []
    },
    "quote": {
      "rate": 1.082,
      "fees": 0.61,
      "totalAmount": 1081.39
    },
    "expiresAt": "2024-01-01T12:05:00.000Z"
  }
}
```

### Get Available Corridors

```bash
GET /api/v1/route/corridors
```

**Response:**
```json
{
  "success": true,
  "corridors": ["EUR-US", "GBP-EU", "USD-EU"],
  "count": 3
}
```

### Get Available PSPs

```bash
GET /api/v1/route/psps
```

**Response:**
```json
{
  "success": true,
  "psps": [
    {
      "id": "fastpay",
      "name": "FastPay",
      "type": "off_ramp",
      "corridors": ["EUR-US", "GBP-EU", "USD-EU"],
      "capabilities": {
        "minAmount": 50,
        "maxAmount": 50000,
        "supportedCurrencies": ["USD", "EUR", "GBP", "USDC"],
        "supportedCountries": ["US", "GB", "DE", "FR", "IT", "ES"],
        "estimatedDelivery": 90,
        "fees": {
          "fixed": 5,
          "percentage": 0.02
        },
        "methods": ["bank_transfer", "card"]
      }
    }
  ],
  "count": 3
}
```

## Corridors

### Supported Corridors

1. **EUR-US**: High compliance, KYC + Travel Rule required for amounts > $1,000
2. **GBP-EU**: High compliance, KYC + Travel Rule required for amounts > £1,000
3. **USD-EU**: Medium compliance, KYC required for amounts > $5,000

### Policy Packs

Each corridor has a policy pack that defines:
- **KYC Requirements**: When KYC verification is required
- **KYB Requirements**: Business verification requirements
- **Sanctions Check**: Always required for high-compliance corridors
- **Travel Rule**: Required for amounts above threshold
- **Amount Limits**: Min/max amounts per corridor
- **Supported Currencies**: Available currencies for the corridor

## PSP Adapters

### FastPay
- **Speed**: ⚡ Fast (90 seconds)
- **Cost**: 💰 Higher fees (2% + $5 fixed)
- **Reliability**: 95%
- **Best for**: Urgent transfers

### CheapTransfer
- **Speed**: 🐌 Slower (240 seconds)
- **Cost**: 💰 Lower fees (1% + $2 fixed)
- **Reliability**: 92%
- **Best for**: Cost-sensitive transfers

### ReliableRoute
- **Speed**: ⚖️ Balanced (150 seconds)
- **Cost**: 💰 Moderate fees (1.5% + $3 fixed)
- **Reliability**: 98% (highest)
- **Best for**: Reliability-focused transfers

## Route Scoring

Routes are scored using a weighted formula:

```
Score = (Cost Score × 0.4) + (Speed Score × 0.3) + (Reliability × 0.3)
```

- **Cost Score**: Normalized inverse cost (lower cost = higher score)
- **Speed Score**: Normalized inverse time (faster = higher score)
- **Reliability**: Direct score (0-1, higher is better)

The route with the highest score is selected as the primary route.

## Policy Evaluation

### KYC/KYB
- **KYC**: Required for individual transfers above threshold
- **KYB**: Required for business transfers (not yet implemented in mock)

### Sanctions Check
- Always required for high-compliance corridors
- Mock implementation always passes (production would call sanctions API)

### Travel Rule
- Required for amounts above threshold (typically $1,000)
- Generates Travel Rule payload with originator/beneficiary information
- Mock implementation always passes (production would validate with compliance service)

## Failover Logic

If the primary route fails:
1. System automatically tries the first alternative route
2. If that fails, tries the second alternative route
3. All routes are pre-scored and sorted by quality
4. Routes are validated for availability before selection

## Testing

### Basic Route Selection

```bash
curl -X POST http://localhost:3000/api/v1/route/choose \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EUR",
    "to": "USD",
    "amount": 1000,
    "corridor": "EUR-US"
  }'
```

### With Recipient Info (Travel Rule)

```bash
curl -X POST http://localhost:3000/api/v1/route/choose \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EUR",
    "to": "USD",
    "amount": 1500,
    "corridor": "EUR-US",
    "metadata": {
      "recipientInfo": {
        "name": "John Doe",
        "accountNumber": "123456789",
        "country": "US"
      }
    }
  }'
```

### Get Corridors

```bash
curl http://localhost:3000/api/v1/route/corridors
```

### Get PSPs

```bash
curl http://localhost:3000/api/v1/route/psps
```

## Error Handling

### Policy Evaluation Failed

```json
{
  "success": false,
  "error": "Policy evaluation failed: Minimum amount is $100"
}
```

### No PSPs Available

```json
{
  "success": false,
  "error": "No PSP adapters available for corridor: EUR-US"
}
```

### Invalid Request

```json
{
  "success": false,
  "error": "Missing required parameters: from, to, amount, and corridor are required"
}
```

## Integration with FX Service

The route service automatically integrates with the FX Quote Service:
- If `from` and `to` currencies differ, an FX quote is fetched
- The quote includes rate, fees, and total amount
- This ensures accurate cost calculation for the route

## Future Enhancements

- [ ] Real PSP integrations (Stripe, Wise, etc.)
- [ ] Real sanctions screening API
- [ ] Real Travel Rule validation
- [ ] Historical route performance tracking
- [ ] Dynamic route scoring based on real-time data
- [ ] Multi-currency corridor support
- [ ] Route optimization for bulk transfers

