# 🌐 Public Reliability & Cost Dashboard

## Overview

The Public Dashboard provides transparent KPIs and system status information for all corridors. This enables users to see real-time reliability metrics, costs, and delivery times before making transfers.

## Features

- ✅ **Corridor KPIs**: All-in cost on $200, median delivery time, success rate
- ✅ **Cost Breakdown**: Average fees, spread, and total costs
- ✅ **Delivery Statistics**: Min, max, median, P95, P99 delivery times
- ✅ **System Status**: Overall health, uptime, corridor/PSP status
- ✅ **Public Access**: No authentication required

## API Endpoints

### Get Corridor KPIs

```bash
GET /api/v1/public/kpi/corridors?corridor=EUR-US
```

**Query Parameters:**
- `corridor` (optional): Filter by specific corridor (e.g., 'EUR-US')

**Response (All Corridors):**
```json
{
  "success": true,
  "kpis": [
    {
      "corridor": "EUR-US",
      "from": "EUR",
      "to": "USD",
      "metrics": {
        "allInCost200": 4.50,
        "medianDelivery": 120,
        "successRate": 0.98,
        "totalExecutions": 1250,
        "successfulExecutions": 1225,
        "failedExecutions": 25
      },
      "costBreakdown": {
        "averageFees": 2.10,
        "averageSpread": 1.80,
        "averageTotal": 3.90
      },
      "deliveryStats": {
        "min": 60,
        "max": 300,
        "median": 120,
        "p95": 180,
        "p99": 240
      },
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Response (Single Corridor):**
```json
{
  "success": true,
  "kpi": {
    "corridor": "EUR-US",
    "from": "EUR",
    "to": "USD",
    "metrics": { /* same as above */ },
    "costBreakdown": { /* same as above */ },
    "deliveryStats": { /* same as above */ },
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get System Status

```bash
GET /api/v1/public/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "status": "operational",
    "uptime": 99.5,
    "lastIncident": null,
    "corridors": {
      "total": 5,
      "operational": 4,
      "degraded": 1,
      "down": 0
    },
    "psp": {
      "total": 3,
      "operational": 3,
      "degraded": 0,
      "down": 0
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## KPI Metrics Explained

### All-In Cost on $200

The total cost (fees + spread) normalized to a $200 transfer amount. This allows easy comparison across corridors regardless of actual transfer amounts.

**Calculation:**
```
allInCost200 = median((totalCost / amount) * 200)
```

### Median Delivery Time

The median actual delivery time in seconds for successful transfers. This represents the typical delivery time users can expect.

### Success Rate

The percentage of successful route executions (0-1 scale, where 1 = 100% success).

**Calculation:**
```
successRate = successfulExecutions / totalExecutions
```

### Delivery Statistics

- **Min**: Fastest delivery time
- **Max**: Slowest delivery time
- **Median**: 50th percentile delivery time
- **P95**: 95th percentile (95% of deliveries are faster)
- **P99**: 99th percentile (99% of deliveries are faster)

## System Status

### Status Levels

- **operational**: System is fully operational (uptime ≥ 99%, no down corridors/PSPs)
- **degraded**: System is operational but with some issues (uptime ≥ 95%, some degraded corridors)
- **down**: System has significant issues (uptime < 95% or corridors/PSPs are down)

### Corridor Status

- **operational**: Success rate ≥ 95%
- **degraded**: Success rate 80-95%
- **down**: Success rate < 80%

### PSP Status

- **operational**: Success rate ≥ 95%
- **degraded**: Success rate 80-95%
- **down**: Success rate < 80%

## Database Schema

### Route Executions

```sql
CREATE TABLE route_executions (
    id UUID PRIMARY KEY,
    route_id VARCHAR(255) NOT NULL,
    corridor VARCHAR(50) NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    psp_id VARCHAR(100) NOT NULL,
    psp_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_cost DECIMAL(20, 6) DEFAULT 0,
    fees DECIMAL(20, 6) DEFAULT 0,
    spread DECIMAL(20, 6) DEFAULT 0,
    estimated_delivery INTEGER,
    actual_delivery_time INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    receipt_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Execution Tracking

Route executions are automatically tracked when:
1. A route is chosen via `POST /api/v1/route/choose`
2. Execution status is updated when transfers complete/fail

### Recording Executions

Executions are recorded with:
- Route details (corridor, currencies, amount)
- PSP information
- Cost breakdown (fees, spread, total)
- Delivery estimates
- Status (pending → success/failed)

### Updating Executions

When a transfer completes, update the execution:

```typescript
import { getKPIService } from '../services/dashboard/kpiService';

const kpiService = getKPIService();

// On success
await kpiService.updateExecutionStatus(
  executionId,
  'success',
  actualDeliveryTime // in seconds
);

// On failure
await kpiService.updateExecutionStatus(
  executionId,
  'failed',
  undefined,
  errorMessage
);
```

## Migration

Run the migration to create the route_executions table:

```sql
-- See: backend/src/db/migrations/add_dashboard_tables.sql
```

## Testing

### Get All Corridor KPIs

```bash
curl http://localhost:3000/api/v1/public/kpi/corridors
```

### Get Specific Corridor KPI

```bash
curl "http://localhost:3000/api/v1/public/kpi/corridors?corridor=EUR-US"
```

### Get System Status

```bash
curl http://localhost:3000/api/v1/public/status
```

## Integration

### Automatic Execution Tracking

The route selection endpoint (`POST /api/v1/route/choose`) automatically records executions. No additional code needed.

### Manual Execution Updates

Update execution status when transfers complete:

```typescript
// In your transfer completion handler
import { getKPIService } from '../services/dashboard/kpiService';

const kpiService = getKPIService();

// Find execution by routeId or receiptId
// Then update status
await kpiService.updateExecutionStatus(executionId, 'success', deliveryTime);
```

## Use Cases

1. **Pre-Transfer Research**: Users can check corridor costs and delivery times before initiating transfers
2. **Transparency**: Public visibility into system reliability and costs
3. **Comparison**: Compare different corridors and PSPs
4. **Monitoring**: System operators can monitor corridor health
5. **Compliance**: Demonstrate best-execution practices

## Future Enhancements

- [ ] Historical trends (cost/delivery over time)
- [ ] Corridor comparison charts
- [ ] Real-time updates via WebSocket
- [ ] Export KPIs to CSV/JSON
- [ ] Alert system for degraded corridors
- [ ] A/B testing results for route selection
- [ ] User feedback integration
- [ ] Mobile app integration

