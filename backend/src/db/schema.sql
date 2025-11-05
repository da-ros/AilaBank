-- AilaBank Database Schema for Supabase
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(42) UNIQUE NOT NULL,
    circle_wallet_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- deposit, withdraw, yield_accrued
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Decision logs
CREATE TABLE IF NOT EXISTS ai_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    intent_type VARCHAR(50) NOT NULL,
    raw_input TEXT,
    parsed_intent JSONB,
    decision JSONB,
    confidence DECIMAL(3, 2),
    executed BOOLEAN DEFAULT false,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50),
    inputs JSONB,
    outputs JSONB,
    reasoning TEXT,
    on_chain_proof VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_hash ON ledger(tx_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_user_id ON ai_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created_at ON ai_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_id ON audit_logs(action_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own ledger" ON ledger
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text)
    );

CREATE POLICY "Users can view own decisions" ON ai_decisions
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text)
    );

CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text)
    );

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access" ON ledger
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access" ON ai_decisions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access" ON audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

