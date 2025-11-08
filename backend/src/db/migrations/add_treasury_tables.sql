-- Treasury & RateSweep Tables
-- Run this in Supabase SQL Editor

-- Treasury policies table
CREATE TABLE IF NOT EXISTS treasury_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RateSweep runs table
CREATE TABLE IF NOT EXISTS ratesweep_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    balances JSONB DEFAULT '[]'::jsonb,
    idle_balances JSONB DEFAULT '[]'::jsonb,
    evaluations JSONB DEFAULT '[]'::jsonb,
    actions TEXT[] DEFAULT '{}',
    executed BOOLEAN DEFAULT false,
    execution_results JSONB DEFAULT '[]'::jsonb,
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_treasury_policies_status ON treasury_policies(status);
CREATE INDEX IF NOT EXISTS idx_treasury_policies_priority ON treasury_policies(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ratesweep_runs_timestamp ON ratesweep_runs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ratesweep_runs_executed ON ratesweep_runs(executed);

-- Insert default policies
INSERT INTO treasury_policies (name, description, status, rules, priority) VALUES
(
    'Buffer Maintenance Policy',
    'Maintains 10-20% of TVL in liquidity buffer for instant withdrawals',
    'active',
    '[
        {
            "type": "buffer_percent",
            "condition": "bufferPercent < 10",
            "action": "topup_buffer",
            "parameters": {"targetPercent": 15}
        }
    ]'::jsonb,
    10
),
(
    'Idle Balance Allocation Policy',
    'Allocates idle balances (>$100, idle >1 hour) to yield generation',
    'active',
    '[
        {
            "type": "idle_balance",
            "condition": "idleAmount > 100 AND idleDuration > 3600",
            "action": "allocate_to_yield",
            "parameters": {"threshold": 100, "allocationPercent": 80}
        }
    ]'::jsonb,
    5
),
(
    'APY Threshold Policy',
    'Only allocates to yield if expected APY > 3%',
    'active',
    '[
        {
            "type": "apy_threshold",
            "condition": "expectedAPY > 3",
            "action": "allocate_to_yield",
            "parameters": {"minAPY": 3}
        }
    ]'::jsonb,
    3
)
ON CONFLICT DO NOTHING;

