# 🏪 Merchant Toolkit APIs

## Overview

The Merchant Toolkit provides a complete suite of APIs for merchants to accept payments, manage subscriptions, track yield-share, and export accounting data. This enables "zero-MDR" settlements via yield-share offset.

## Features

- ✅ **Invoices**: Create, fetch, pay, and refund invoices
- ✅ **Subscriptions**: Create plans, subscribe customers, charge, and cancel
- ✅ **Yield-Share Accumulator**: Track settlement micro-yield until payout
- ✅ **Accounting Exports**: CSV generation and QuickBooks webhook integration

## API Endpoints

### Invoices

#### Create Invoice

```bash
POST /api/v1/merchant/invoices
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "customer-user-id",
  "amount": 100.00,
  "currency": "USDC",
  "description": "Invoice for services",
  "lineItems": [
    {
      "description": "Service A",
      "quantity": 1,
      "unitPrice": 100.00,
      "total": 100.00
    }
  ],
  "dueDate": "2024-12-31T23:59:59Z",
  "metadata": {
    "customerEmail": "customer@example.com",
    "customerName": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "invoice-uuid",
    "merchantId": "merchant-user-id",
    "customerId": "customer-user-id",
    "invoiceNumber": "INV-XXXXX-XXXX",
    "status": "draft",
    "amount": 100.00,
    "currency": "USDC",
    "description": "Invoice for services",
    "lineItems": [...],
    "dueDate": "2024-12-31T23:59:59Z",
    "paidAmount": 0,
    "refundedAmount": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get Invoice

```bash
GET /api/v1/merchant/invoices/:id
```

**Response:**
```json
{
  "success": true,
  "invoice": { /* invoice object */ }
}
```

#### Get Merchant Invoices

```bash
GET /api/v1/merchant/invoices?status=paid&page=1&limit=50
```

**Query Parameters:**
- `status` (optional): Filter by status (draft, sent, paid, partially_paid, overdue, cancelled, refunded)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Entries per page (default: 50)

**Response:**
```json
{
  "success": true,
  "invoices": [ /* array of invoices */ ],
  "total": 100,
  "hasMore": true
}
```

#### Pay Invoice

```bash
POST /api/v1/merchant/invoices/:id/pay
```

**Request Body:**
```json
{
  "paymentMethod": "wallet",
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "invoice": { /* updated invoice with status='paid' */ }
}
```

#### Refund Invoice

```bash
POST /api/v1/merchant/invoices/:id/refund
```

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "Customer requested partial refund"
}
```

**Response:**
```json
{
  "success": true,
  "invoice": { /* updated invoice with refundedAmount */ }
}
```

### Subscriptions

#### Create Subscription Plan

```bash
POST /api/v1/merchant/subscriptions/plans
```

**Request Body:**
```json
{
  "name": "Premium Plan",
  "description": "Monthly premium subscription",
  "amount": 29.99,
  "currency": "USDC",
  "frequency": "monthly",
  "trialDays": 7,
  "metadata": {
    "features": ["feature1", "feature2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "plan-uuid",
    "merchantId": "merchant-user-id",
    "name": "Premium Plan",
    "description": "Monthly premium subscription",
    "amount": 29.99,
    "currency": "USDC",
    "frequency": "monthly",
    "trialDays": 7,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get Subscription Plan

```bash
GET /api/v1/merchant/subscriptions/plans/:id
```

#### Subscribe to Plan

```bash
POST /api/v1/merchant/subscriptions
```

**Request Body:**
```json
{
  "planId": "plan-uuid",
  "paymentMethod": "wallet",
  "metadata": {
    "customerNotes": "Special instructions"
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "subscription-uuid",
    "planId": "plan-uuid",
    "merchantId": "merchant-user-id",
    "customerId": "customer-user-id",
    "status": "active",
    "currentPeriodStart": "2024-01-01T12:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T12:00:00.000Z",
    "nextBillingDate": "2024-02-01T12:00:00.000Z",
    "amount": 29.99,
    "currency": "USDC",
    "frequency": "monthly",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get Customer Subscriptions

```bash
GET /api/v1/merchant/subscriptions
```

**Response:**
```json
{
  "success": true,
  "subscriptions": [ /* array of subscriptions */ ]
}
```

#### Cancel Subscription

```bash
POST /api/v1/merchant/subscriptions/:id/cancel
```

**Response:**
```json
{
  "success": true,
  "subscription": { /* cancelled subscription */ }
}
```

### Yield-Share Accumulator

#### Get Yield-Share Accumulators

```bash
GET /api/v1/merchant/yield-share?status=accumulating
```

**Query Parameters:**
- `status` (optional): Filter by status (accumulating, payout_pending, paid_out)

**Response:**
```json
{
  "success": true,
  "accumulators": [
    {
      "id": "accumulator-uuid",
      "merchantId": "merchant-user-id",
      "invoiceId": "invoice-uuid",
      "transactionId": "transaction-id",
      "settlementAmount": 1000.00,
      "yieldAccumulated": 1.37,
      "yieldRate": 0.05,
      "status": "accumulating",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "totalYield": 15.50
}
```

#### Request Payout

```bash
POST /api/v1/merchant/yield-share/:id/payout
```

**Response:**
```json
{
  "success": true,
  "accumulator": { /* accumulator with status='payout_pending' */ }
}
```

### Accounting Exports

#### Generate CSV Export

```bash
POST /api/v1/merchant/accounting/export/csv
```

**Request Body:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Response:**
- Returns CSV file as download
- Headers: Date, Type, Reference, Description, Amount, Currency, Debit Account, Credit Account, Transaction Hash

#### Send to QuickBooks

```bash
POST /api/v1/merchant/accounting/export/quickbooks
```

**Request Body:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "webhookUrl": "https://quickbooks-webhook.example.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "exportId": "export-uuid",
  "status": "completed"
}
```

#### Get Accounting Exports

```bash
GET /api/v1/merchant/accounting/exports
```

**Response:**
```json
{
  "success": true,
  "exports": [
    {
      "id": "export-uuid",
      "merchantId": "merchant-user-id",
      "type": "csv",
      "period": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-12-31T23:59:59Z"
      },
      "format": "csv",
      "status": "completed",
      "fileUrl": "https://...",
      "recordCount": 150,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Yield-Share Mechanism

### How It Works

1. **Settlement**: When a customer pays an invoice or subscription charge, a yield-share accumulator is created
2. **Accumulation**: The accumulator tracks micro-yield earned on the settlement amount at the current APY rate
3. **Daily Updates**: Yield accumulates daily: `dailyYield = settlementAmount * (APY / 365)`
4. **Payout**: Merchant can request payout of accumulated yield, which is transferred to their wallet

### Example

- Settlement: $1,000 USDC
- APY: 5%
- Daily yield: $1,000 × (0.05 / 365) = $0.137
- After 10 days: $1.37 accumulated
- After 30 days: $4.11 accumulated

### Zero-MDR Concept

Traditional payment processors charge 2-3% MDR (Merchant Discount Rate). With yield-share:
- Settlement: $1,000
- Traditional MDR (2.5%): -$25
- Yield-share (5% APY, 30 days): +$4.11
- **Effective MDR: ~2.1%** (and can go to 0% with longer settlement periods)

## Database Schema

See `backend/src/db/migrations/add_merchant_tables.sql` for the complete schema.

### Key Tables

- **invoices**: Invoice records with payment tracking
- **subscription_plans**: Recurring subscription plans
- **subscriptions**: Active customer subscriptions
- **yield_share_accumulators**: Yield accumulation tracking
- **accounting_exports**: Export history and status

## Testing

### Create and Pay Invoice

```bash
# Create invoice
curl -X POST http://localhost:3000/api/v1/merchant/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Test invoice"
  }'

# Pay invoice
curl -X POST http://localhost:3000/api/v1/merchant/invoices/{invoice-id}/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "wallet"
  }'
```

### Create Subscription

```bash
# Create plan
curl -X POST http://localhost:3000/api/v1/merchant/subscriptions/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Plan",
    "amount": 29.99,
    "frequency": "monthly"
  }'

# Subscribe
curl -X POST http://localhost:3000/api/v1/merchant/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid"
  }'
```

### Export Accounting Data

```bash
# CSV export
curl -X POST http://localhost:3000/c \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }' \
  --output accounting-export.csv
```

## Integration Notes

### Automatic Yield Accumulation

The system automatically creates yield-share accumulators when:
- An invoice is paid
- A subscription is charged

### Periodic Updates

Run a daily cron job to update yield accumulations:

```typescript
import { getYieldShareService } from './services/merchant/yieldShareService';

const yieldShareService = getYieldShareService();
await yieldShareService.updateAccumulations();
```

### Subscription Billing

Subscriptions are automatically charged on their `nextBillingDate`. In production, you'd want a cron job to:
1. Find subscriptions with `nextBillingDate <= now` and `status = 'active'`
2. Call `chargeSubscription(subscriptionId)` for each

## Future Enhancements

- [ ] Automatic subscription billing cron job
- [ ] Webhook notifications for invoice/subscription events
- [ ] Multi-currency support
- [ ] Invoice templates and customization
- [ ] Subscription proration on cancellation
- [ ] Yield-share payout automation
- [ ] Additional accounting software integrations (Xero, Sage, etc.)
- [ ] Real-time yield accumulation updates
- [ ] Merchant dashboard for analytics

