-- Update ledger table for double-entry accounting
-- Run this in Supabase SQL Editor

-- Add new columns for double-entry accounting
ALTER TABLE ledger 
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS side VARCHAR(10) CHECK (side IN ('debit', 'credit')),
  ADD COLUMN IF NOT EXISTS account VARCHAR(50) DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS counterparty VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on correlation_id for linking related entries
CREATE INDEX IF NOT EXISTS idx_ledger_correlation_id ON ledger(correlation_id);

-- Create index on account for account-based queries
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account);

-- Create index on side for debit/credit queries
CREATE INDEX IF NOT EXISTS idx_ledger_side ON ledger(side);

-- Update existing entries to have default values
UPDATE ledger 
SET 
  side = CASE 
    WHEN action_type IN ('deposit', 'yield_accrued') THEN 'credit'
    WHEN action_type IN ('withdraw', 'fee') THEN 'debit'
    ELSE 'debit'
  END,
  account = 'wallet',
  description = action_type || ' ' || amount || ' ' || currency,
  metadata = '{}'::jsonb
WHERE side IS NULL;

