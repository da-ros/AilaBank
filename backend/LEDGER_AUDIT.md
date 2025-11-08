# 📊 Ledger & Audit System

## Overview

The Ledger & Audit system provides double-entry accounting with correlation IDs and append-only audit trails for complete financial transparency and compliance.

## Features

- ✅ **Double-Entry Accounting**: Every transaction has matching debit and credit entries
- ✅ **Correlation IDs**: Link related entries across services (FX, routes, transfers)
- ✅ **Append-Only Audit Trails**: Immutable audit logs for all operations
- ✅ **Account-Based Tracking**: Track balances across different accounts (wallet, buffer, yield_pool)
- ✅ **Comprehensive Statistics**: Total deposits, withdrawals, yield, fees, and balances
- ✅ **Filtering & Pagination**: Filter by type, date range, and paginate results

## API Endpoints

### Get Ledger Statistics

```bash
GET /api/v1/ledger/stats?userId=xxx&startDate=2024-01-01&endDate=2024-12-31
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (optional): User ID filter (admin only)
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format

**Response:**
```json
{
  "success": true,
  "stats": {
    "userId": "user-id",
    "totalDeposits": 10000.50,
    "totalWithdrawals": 2500.00,
    "totalYield": 125.75,
    "totalFees": 45.20,
    "currentBalance": 7581.05,
    "currency": "USDC",
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z"
    },
    "breakdown": {
      "byType": {
        "deposit": 10000.50,
        "withdraw": 2500.00,
        "yield_accrued": 125.75,
        "fee": 45.20,
        "transfer": 0,
        "fx_conversion": 0,
        "allocation": 0,
        "buffer_topup": 0,
        "buffer_withdraw": 0
      },
      "byAccount": {
        "wallet": 5000.00,
        "buffer": 1500.00,
        "yield_pool": 1081.05
      }
    }
  }
}
```

### Get User Ledger

```bash
GET /api/v1/ledger/user/:id?page=1&limit=50&entryType=deposit&startDate=2024-01-01
```

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id`: User ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Entries per page (default: 50)
- `entryType` (optional): Filter by type (deposit, withdraw, yield_accrued, fee, etc.)
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format

**Response:**
```json
{
  "success": true,
  "ledger": {
    "userId": "user-id",
    "entries": [
      {
        "id": "entry-uuid",
        "correlationId": "correlation-uuid",
        "userId": "user-id",
        "entryType": "deposit",
        "side": "credit",
        "amount": 1000.00,
        "currency": "USDC",
        "account": "wallet",
        "description": "Deposit: 1000.00 USDC",
        "txHash": "0x...",
        "status": "completed",
        "metadata": {
          "quoteId": "quote-uuid",
          "routeId": "route-uuid"
        },
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "balance": 7581.05,
    "currency": "USDC",
    "stats": { /* stats object */ },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "hasMore": true
    }
  }
}
```

### Get Current User Ledger (Convenience)

```bash
GET /api/v1/ledger?page=1&limit=50
```

Same as above, but automatically uses the authenticated user's ID.

## Double-Entry Accounting

### Principles

Every transaction creates two entries:
- **Debit**: Money leaving an account
- **Credit**: Money entering an account

The sum of all debits must equal the sum of all credits (balanced books).

### Example: Deposit

When a user deposits 1000 USDC:

```
Debit:  external → 1000 USDC (money comes from external source)
Credit: wallet   → 1000 USDC (money enters wallet)
```

### Example: Withdrawal

When a user withdraws 500 USDC:

```
Debit:  wallet   → 500 USDC (money leaves wallet)
Credit: external → 500 USDC (money goes to external address)
```

### Example: Yield Accrual

When yield is earned:

```
Debit:  yield_pool → 10 USDC (yield earned)
Credit: wallet     → 10 USDC (yield added to wallet)
```

### Example: Fee

When a fee is charged:

```
Debit:  wallet → 5 USDC (fee deducted from wallet)
Credit: fees   → 5 USDC (fee collected)
```

## Correlation IDs

Correlation IDs link related entries across services:

- **FX Conversion**: Links FX quote, route selection, and ledger entries
- **Transfer**: Links transfer transaction, route, and ledger entries
- **Receipt**: Links receipt, quotes, route, and ledger entries

Example:
```typescript
// All these share the same correlationId:
- FX Quote: correlationId = "abc-123"
- Route Selection: correlationId = "abc-123"
- Ledger Entry (debit): correlationId = "abc-123"
- Ledger Entry (credit): correlationId = "abc-123"
- Receipt: correlationId = "abc-123"
```

## Account Types

- **wallet**: User's main wallet balance
- **buffer**: Liquidity buffer account
- **yield_pool**: Yield-generating pool account
- **external**: External addresses (for deposits/withdrawals)
- **fees**: Fee collection account

## Entry Types

- **deposit**: Money deposited into wallet
- **withdraw**: Money withdrawn from wallet
- **transfer**: Internal transfer between accounts
- **yield_accrued**: Yield earned on investments
- **fee**: Fees charged
- **fx_conversion**: Currency conversion
- **allocation**: Allocation to yield pool
- **buffer_topup**: Buffer top-up
- **buffer_withdraw**: Buffer withdrawal

## Audit Trails

Every ledger operation creates an audit log entry:

```json
{
  "id": "audit-uuid",
  "correlationId": "correlation-uuid",
  "userId": "user-id",
  "actionType": "deposit",
  "service": "ledger",
  "inputs": {
    "entryType": "deposit",
    "amount": 1000,
    "currency": "USDC"
  },
  "outputs": {
    "debitId": "debit-uuid",
    "creditId": "credit-uuid"
  },
  "reasoning": "Double-entry transaction: Deposit 1000 USDC",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

Audit logs are:
- **Append-only**: Never modified or deleted
- **Immutable**: Historical record of all operations
- **Correlated**: Linked via correlation IDs
- **Traceable**: Full input/output tracking

## Database Schema

### Ledger Table

```sql
CREATE TABLE ledger (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    correlation_id UUID, -- Links related entries
    action_type VARCHAR(50) NOT NULL,
    side VARCHAR(10) CHECK (side IN ('debit', 'credit')),
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    account VARCHAR(50) DEFAULT 'wallet',
    counterparty VARCHAR(255),
    description TEXT,
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action_id UUID, -- Correlation ID
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50),
    inputs JSONB,
    outputs JSONB,
    reasoning TEXT,
    on_chain_proof VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Migration

Run the migration to update the ledger table:

```sql
-- See: backend/src/db/migrations/update_ledger_table.sql
```

This adds:
- `correlation_id`: For linking related entries
- `side`: Debit or credit
- `account`: Account identifier
- `counterparty`: For transfers
- `description`: Human-readable description
- `metadata`: Additional JSON data

## Testing

### Get Stats

```bash
curl http://localhost:3000/api/v1/ledger/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Ledger

```bash
curl "http://localhost:3000/api/v1/ledger/user/{user-id}?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Current User Ledger

```bash
curl "http://localhost:3000/api/v1/ledger?entryType=deposit" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter by Date Range

```bash
curl "http://localhost:3000/api/v1/ledger?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

## Integration

### Using Ledger Service in Other Services

```typescript
import { getLedgerService } from '../services/ledger/ledgerService';

const ledgerService = getLedgerService();

// Create double-entry transaction
await ledgerService.createDoubleEntry(
  userId,
  'deposit',
  'external', // Debit: money from external
  'wallet',   // Credit: money to wallet
  1000,
  'USDC',
  'Deposit from bank account',
  { quoteId: 'xxx', routeId: 'yyy' }
);

// Create single entry (for external transactions)
await ledgerService.createEntry(
  userId,
  'withdraw',
  'debit',
  500,
  'USDC',
  'wallet',
  'Withdrawal to bank account',
  'bank-account-123',
  '0x...',
  { transferId: 'xxx' }
);
```

## Balance Calculation

Balances are calculated as:
```
Balance = Sum of Credits - Sum of Debits
```

Only entries with `status = 'completed'` are included in balance calculations.

## Future Enhancements

- [ ] Real-time balance updates via WebSocket
- [ ] Balance snapshots for historical tracking
- [ ] Multi-currency support
- [ ] Account reconciliation reports
- [ ] Export to accounting software (CSV, QuickBooks)
- [ ] Balance alerts and notifications
- [ ] Advanced filtering and search
- [ ] Ledger validation and reconciliation tools

