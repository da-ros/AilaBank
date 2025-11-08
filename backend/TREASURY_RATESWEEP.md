# 💰 Treasury & RateSweep Services

## Overview

The Treasury & RateSweep system automatically detects idle balances, evaluates policies using AI agents, and executes optimal allocations across Circle and Arc. This enables automated treasury management with intelligent decision-making.

## Architecture

```
┌─────────────────────────────────────────┐
│ 1. Balance Detector (Rule-based)        │
│    - Circle wallet balances             │
│    - Arc vault/buffer/yield balances    │
│    - Idle balance detection             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Policy Agent (LangChain AI)         │
│    - Evaluate buffer % thresholds      │
│    - Check APY thresholds               │
│    - De-peg risk assessment            │
│    - Recommend allocation strategy     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Allocation Executor (Rule-based)     │
│    - Call YieldAllocator contract       │
│    - Call LiquidityBuffer contract      │
│    - Execute on-chain transactions     │
└─────────────────────────────────────────┘
```

## Features

- ✅ **Rule-based Detection**: Fast, reliable idle balance detection
- ✅ **AI Policy Evaluation**: LangChain agents for intelligent decision-making
- ✅ **Rule-based Execution**: Reliable on-chain transaction execution
- ✅ **Policy Management**: Create and manage treasury policies
- ✅ **Dry Run Mode**: Test policies without executing transactions
- ✅ **Comprehensive Logging**: Full audit trail of all operations

## API Endpoints

### Run RateSweep

```bash
POST /api/v1/ratesweep/run?dryRun=true&policyIds=policy-1,policy-2
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `dryRun` (optional): `true` to simulate without executing (default: `false`)
- `policyIds` (optional): Comma-separated list of policy IDs to evaluate

**Response:**
```json
{
  "success": true,
  "result": {
    "runId": "run-uuid",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "balances": [
      {
        "source": "circle",
        "balance": 1000.00,
        "currency": "USDC",
        "walletId": "wallet-id",
        "address": "0x...",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ],
    "idleBalances": [
      {
        "source": "circle",
        "amount": 500.00,
        "currency": "USDC",
        "idleSince": "2024-01-01T10:00:00.000Z",
        "idleDuration": 7200
      }
    ],
    "evaluations": [
      {
        "policyId": "policy-uuid",
        "policyName": "Buffer Maintenance Policy",
        "triggered": true,
        "matchedRules": [...],
        "recommendedAction": "topup_buffer",
        "reasoning": "Buffer is at 8%, below 10% threshold. Recommend top-up to 15%.",
        "confidence": 0.95,
        "parameters": {
          "targetPercent": 15,
          "amount": 200
        }
      }
    ],
    "actions": ["topup_buffer"],
    "executed": false,
    "executionResults": [
      {
        "action": "topup_buffer",
        "success": true,
        "amount": 200.00,
        "currency": "USDC",
        "txHash": "0x...",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ],
    "summary": {
      "totalIdle": 500.00,
      "totalAllocated": 200.00,
      "totalYield": 1000.00,
      "totalBuffer": 300.00
    }
  }
}
```

### Get Treasury Policies

```bash
GET /api/v1/treasury/policies?status=active
```

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `paused`, `archived`)
- `policyId` (optional): Get specific policy by ID

**Response:**
```json
{
  "success": true,
  "policies": [
    {
      "id": "policy-uuid",
      "name": "Buffer Maintenance Policy",
      "description": "Maintains 10-20% of TVL in liquidity buffer",
      "status": "active",
      "rules": [
        {
          "type": "buffer_percent",
          "condition": "bufferPercent < 10",
          "action": "topup_buffer",
          "parameters": {
            "targetPercent": 15
          }
        }
      ],
      "priority": 10,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Create Treasury Policy

```bash
POST /api/v1/treasury/policies
```

**Request Body:**
```json
{
  "name": "Custom Policy",
  "description": "Custom treasury policy",
  "rules": [
    {
      "type": "idle_balance",
      "condition": "idleAmount > 1000 AND idleDuration > 7200",
      "action": "allocate_to_yield",
      "parameters": {
        "threshold": 1000,
        "allocationPercent": 80
      }
    }
  ],
  "priority": 5,
  "status": "active"
}
```

### Get Balance Snapshots

```bash
GET /api/v1/treasury/balances
```

**Response:**
```json
{
  "success": true,
  "balances": [
    {
      "source": "circle",
      "balance": 1000.00,
      "currency": "USDC",
      "walletId": "wallet-id",
      "address": "0x...",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "source": "arc_vault",
      "balance": 5000.00,
      "currency": "USDC",
      "address": "0x...",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ],
  "idleBalances": [
    {
      "source": "circle",
      "amount": 500.00,
      "currency": "USDC",
      "idleSince": "2024-01-01T10:00:00.000Z",
      "idleDuration": 7200
    }
  ]
}
```

## Policy Types

### Buffer Percent Policy

Maintains liquidity buffer at target percentage of TVL.

```json
{
  "type": "buffer_percent",
  "condition": "bufferPercent < 10",
  "action": "topup_buffer",
  "parameters": {
    "targetPercent": 15
  }
}
```

### Idle Balance Policy

Allocates idle balances to yield generation.

```json
{
  "type": "idle_balance",
  "condition": "idleAmount > 100 AND idleDuration > 3600",
  "action": "allocate_to_yield",
  "parameters": {
    "threshold": 100,
    "allocationPercent": 80
  }
}
```

### APY Threshold Policy

Only allocates if expected APY meets threshold.

```json
{
  "type": "apy_threshold",
  "condition": "expectedAPY > 3",
  "action": "allocate_to_yield",
  "parameters": {
    "minAPY": 3
  }
}
```

### De-peg Control Policy

Prioritizes safety if USDC de-pegs.

```json
{
  "type": "depeg_control",
  "condition": "usdcPrice < 0.995 OR usdcPrice > 1.005",
  "action": "no_action",
  "parameters": {
    "maxDeviation": 0.005
  }
}
```

## Allocation Actions

- **`allocate_to_yield`**: Allocate funds to yield generation pool
- **`topup_buffer`**: Add funds to liquidity buffer
- **`rebalance`**: Rebalance allocations across pools
- **`no_action`**: No action recommended

## AI Agent (LangChain)

The AI agent uses LangChain with OpenAI to:

1. **Context Building**: Aggregates balance data, idle balances, and policy rules
2. **Policy Evaluation**: Uses GPT-5-nano to evaluate policies intelligently
3. **Reasoning**: Provides detailed reasoning for recommendations
4. **Confidence Scoring**: Assigns confidence scores to recommendations
5. **Parameter Extraction**: Extracts action-specific parameters

### Agent Prompt Structure

```
System: You are a treasury management AI agent...
Context: Current balances, idle balances, policy rules
Task: Evaluate policy and recommend action
Output: JSON with triggered, action, reasoning, confidence, parameters
```

## Database Schema

### Treasury Policies

```sql
CREATE TABLE treasury_policies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    rules JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RateSweep Runs

```sql
CREATE TABLE ratesweep_runs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    balances JSONB DEFAULT '[]',
    idle_balances JSONB DEFAULT '[]',
    evaluations JSONB DEFAULT '[]',
    actions TEXT[] DEFAULT '{}',
    executed BOOLEAN DEFAULT false,
    execution_results JSONB DEFAULT '[]',
    summary JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

```env
# Arc Configuration
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_VAULT_ADDRESS=0x...
ARC_BUFFER_ADDRESS=0x...
ARC_YIELD_ALLOCATOR_ADDRESS=0x...
ARC_USDC_ADDRESS=0x...
ARC_PRIVATE_KEY=0x... # For executing transactions

# OpenAI (for Policy Agent)
OPENAI_API_KEY=sk-...
```

## Migration

Run the migration to create treasury tables:

```sql
-- See: backend/src/db/migrations/add_treasury_tables.sql
```

This creates:
- `treasury_policies`: Policy definitions
- `ratesweep_runs`: Execution history
- Default policies (Buffer Maintenance, Idle Balance, APY Threshold)

## Testing

### Dry Run (Test Without Execution)

```bash
curl -X POST "http://localhost:3000/api/v1/ratesweep/run?dryRun=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Policies

```bash
curl "http://localhost:3000/api/v1/treasury/policies" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Balances

```bash
curl "http://localhost:3000/api/v1/treasury/balances" \
  -H "Authorization: Bearer $TOKEN"
```

### Execute RateSweep

```bash
curl -X POST "http://localhost:3000/api/v1/ratesweep/run" \
  -H "Authorization: Bearer $TOKEN"
```

## Default Policies

The system comes with 3 default policies:

1. **Buffer Maintenance Policy** (Priority: 10)
   - Maintains 10-20% TVL in buffer
   - Action: `topup_buffer` when below 10%

2. **Idle Balance Allocation Policy** (Priority: 5)
   - Allocates idle balances >$100, idle >1 hour
   - Action: `allocate_to_yield` (80% allocation)

3. **APY Threshold Policy** (Priority: 3)
   - Only allocates if APY > 3%
   - Action: `allocate_to_yield` if threshold met

## Integration

### Cron Job Setup

Set up a cron job to run RateSweep periodically:

```bash
# Run every hour
0 * * * * curl -X POST "http://localhost:3000/api/v1/ratesweep/run" \
  -H "Authorization: Bearer $CRON_TOKEN"
```

### Webhook Integration

RateSweep can be triggered via webhook after:
- Large deposits
- Balance threshold reached
- Manual trigger from dashboard

## Future Enhancements

- [ ] Real-time balance monitoring
- [ ] Advanced de-peg detection
- [ ] Multi-currency support
- [ ] Custom policy templates
- [ ] Policy performance analytics
- [ ] Automated rebalancing schedules
- [ ] Risk scoring and alerts
- [ ] Integration with external yield sources

