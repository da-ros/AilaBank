# 💱 FX Quote Service

## Overview

The FX Quote Service provides real-time currency exchange quotes with support for multiple providers, normalized quote models, and corridor-aware routing.

## Features

- ✅ **Multiple Providers**: Mock provider (always available) + ExchangeRate-API (real-time rates)
- ✅ **Normalized Quote Model**: Rate, spread, fees, ETA, corridor constraints
- ✅ **Best Quote Selection**: Automatically selects the best quote from available providers
- ✅ **Caching**: Quotes are cached for 60 seconds to reduce API calls
- ✅ **Corridor Support**: Optional corridor constraints (KYC/KYB, sanctions, travel rule)

## API Endpoints

### Get Best Quote

```bash
GET /api/v1/quotes?from=EUR&to=USDC&amount=100
```

**Query Parameters:**
- `from` (required): Source currency (e.g., 'EUR', 'USD', 'GBP')
- `to` (required): Destination currency (e.g., 'USDC', 'USD', 'EUR')
- `amount` (required): Amount to convert (positive number)
- `corridor` (optional): Corridor identifier (e.g., 'EUR-US', 'GBP-EU')
- `all` (optional): Set to 'true' to get quotes from all providers

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/quotes?from=EUR&to=USDC&amount=100"
```

**Example Response:**
```json
{
  "success": true,
  "quote": {
    "quoteId": "uuid-here",
    "from": "EUR",
    "to": "USDC",
    "amount": 100,
    "rate": 1.07679,
    "convertedAmount": 107.679,
    "spread": 0.5,
    "fees": {
      "provider": 0.107679,
      "network": 0.5,
      "total": 0.607679
    },
    "totalAmount": 107.071321,
    "eta": 120,
    "expiresAt": "2024-01-01T12:05:00.000Z",
    "provider": "mock",
    "corridor": {
      "id": "EUR-US",
      "constraints": {
        "kycRequired": true,
        "kybRequired": false,
        "sanctionsCheck": true,
        "travelRuleRequired": true,
        "minAmount": 100,
        "maxAmount": 100000,
        "supportedCurrencies": ["EUR", "USD", "USDC"],
        "estimatedDelivery": 120,
        "complianceLevel": "high"
      }
    },
    "metadata": {
      "source": "mock",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "confidence": 1.0
    }
  }
}
```

### Get All Provider Quotes

```bash
GET /api/v1/quotes?from=EUR&to=USDC&amount=100&all=true
```

Returns quotes from all available providers, sorted by best rate.

### Get Available Providers

```bash
GET /api/v1/quotes/providers
```

**Response:**
```json
{
  "success": true,
  "providers": ["mock", "exchangerate-api"],
  "count": 2
}
```

### Get Supported Currencies

```bash
GET /api/v1/quotes/currencies
```

**Response:**
```json
{
  "success": true,
  "currencies": ["AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "JPY", "USD", "USDC"],
  "count": 9
}
```

## Environment Variables

### ExchangeRate-API (Optional)

To use the real ExchangeRate-API provider, add to your `.env`:

```bash
EXCHANGERATE_API_KEY=your_api_key_here
```

**Getting an API Key:**
1. Visit https://www.exchangerate-api.com/
2. Sign up for a free account (1,500 requests/month)
3. Copy your API key
4. Add it to `.env` as `EXCHANGERATE_API_KEY`

**Note:** The service works without this key (using mock provider only), but real-time rates require it.

## Quote Model

### Fields

- **quoteId**: Unique identifier for the quote
- **from/to**: Source and destination currencies
- **amount**: Original amount to convert
- **rate**: Exchange rate (1 from = rate to)
- **convertedAmount**: Amount after conversion (before fees)
- **spread**: Spread percentage applied
- **fees**: Breakdown of fees (provider, network, total)
- **totalAmount**: Final amount after all fees (what user receives)
- **eta**: Estimated time to arrival in seconds
- **expiresAt**: ISO timestamp when quote expires (5 minutes)
- **provider**: Provider name that generated the quote
- **corridor**: Optional corridor information with constraints
- **metadata**: Additional metadata (source, timestamp, confidence)

### Corridor Constraints

When a corridor is specified, the quote includes compliance constraints:

- **kycRequired**: Whether KYC is required
- **kybRequired**: Whether KYB is required
- **sanctionsCheck**: Whether sanctions screening is required
- **travelRuleRequired**: Whether Travel Rule compliance is required
- **minAmount/maxAmount**: Amount limits for the corridor
- **supportedCurrencies**: Currencies supported in this corridor
- **estimatedDelivery**: Estimated delivery time in seconds
- **complianceLevel**: Compliance level (low/medium/high)

## Testing

### Basic Quote Request

```bash
# EUR to USDC
curl "http://localhost:3000/api/v1/quotes?from=EUR&to=USDC&amount=100"

# USD to EUR
curl "http://localhost:3000/api/v1/quotes?from=USD&to=EUR&amount=50"

# With corridor
curl "http://localhost:3000/api/v1/quotes?from=EUR&to=USDC&amount=100&corridor=EUR-US"
```

### Compare All Providers

```bash
curl "http://localhost:3000/api/v1/quotes?from=EUR&to=USDC&amount=100&all=true"
```

### Error Handling

**Missing Parameters:**
```bash
curl "http://localhost:3000/api/v1/quotes?from=EUR"
# Returns 400 with error message
```

**Invalid Amount:**
```bash
curl "http://localhost:3000/api/v1/quotes?from=EUR&to=USDC&amount=-100"
# Returns 400 with error message
```

**Unsupported Currency:**
```bash
curl "http://localhost:3000/api/v1/quotes?from=XYZ&to=USDC&amount=100"
# Returns 400 with error message
```

## Architecture

### Providers

1. **MockFXProvider**: Always available, deterministic rates for testing
2. **ExchangeRateAPIProvider**: Real-time rates from exchangerate-api.com (requires API key)

### Service Flow

1. Request validation (currency codes, amount)
2. Cache check (60-second TTL)
3. Fetch quotes from all available providers in parallel
4. Select best quote (highest totalAmount)
5. Cache and return quote

### Caching

Quotes are cached in Redis with a 60-second TTL to:
- Reduce API calls to external providers
- Improve response times
- Handle rate limits

Cache key format: `fx:quote:{from}:{to}:{amount}`

## Integration with Intent Engine

The FX service is designed to integrate with the AI Intent Engine:

```typescript
// Example: User says "Deposit 100 euros"
// Intent Engine calls:
const quote = await quoteService.getQuote({
  from: 'EUR',
  to: 'USDC',
  amount: 100,
  corridor: 'EUR-US',
});

// Returns quote with rate, fees, ETA
// Intent Engine uses this to inform user and execute transaction
```

## Future Enhancements

- [ ] Add more FX providers (Fixer.io, CurrencyLayer, etc.)
- [ ] Historical rate tracking
- [ ] Rate alerts
- [ ] Bulk quote requests
- [ ] Provider failover logic
- [ ] Rate limit handling per provider

