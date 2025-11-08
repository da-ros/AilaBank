-- Public Dashboard Tables
-- Run this in Supabase SQL Editor

-- Route executions table (tracks all route executions for KPI calculation)
CREATE TABLE IF NOT EXISTS route_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id VARCHAR(255) NOT NULL,
    corridor VARCHAR(50) NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    psp_id VARCHAR(100) NOT NULL,
    psp_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    total_cost DECIMAL(20, 6) DEFAULT 0,
    fees DECIMAL(20, 6) DEFAULT 0,
    spread DECIMAL(20, 6) DEFAULT 0,
    estimated_delivery INTEGER, -- Estimated delivery time in seconds
    actual_delivery_time INTEGER, -- Actual delivery time in seconds
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    receipt_id UUID, -- Link to receipt if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_executions_corridor ON route_executions(corridor);
CREATE INDEX IF NOT EXISTS idx_route_executions_status ON route_executions(status);
CREATE INDEX IF NOT EXISTS idx_route_executions_started_at ON route_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_executions_psp_id ON route_executions(psp_id);
CREATE INDEX IF NOT EXISTS idx_route_executions_route_id ON route_executions(route_id);

-- Composite index for KPI queries
CREATE INDEX IF NOT EXISTS idx_route_executions_corridor_status ON route_executions(corridor, status);

