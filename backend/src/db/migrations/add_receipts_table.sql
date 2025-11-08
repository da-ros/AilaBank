-- Add receipts table for Best-Execution Receipts
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_data JSONB NOT NULL,
    receipt_hash VARCHAR(66) NOT NULL, -- Keccak256 hash of receipt
    on_chain_tx_hash VARCHAR(66), -- Transaction hash on-chain
    on_chain_block_number BIGINT, -- Block number
    on_chain_contract_address VARCHAR(42), -- Contract address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_hash ON receipts(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_receipts_on_chain_tx_hash ON receipts(on_chain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own receipts
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text)
        OR user_id IS NULL -- Public receipts (if any)
    );

-- Service role can do everything
CREATE POLICY "Service role full access" ON receipts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

