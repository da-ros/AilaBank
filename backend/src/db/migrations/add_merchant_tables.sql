-- Merchant Toolkit Tables
-- Run this in Supabase SQL Editor

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded')),
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    description TEXT NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_date TIMESTAMP WITH TIME ZONE,
    paid_amount DECIMAL(20, 6) DEFAULT 0,
    refunded_amount DECIMAL(20, 6) DEFAULT 0,
    payment_method VARCHAR(50),
    tx_hash VARCHAR(66),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    trial_days INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    frequency VARCHAR(50) NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yield-share accumulators table
CREATE TABLE IF NOT EXISTS yield_share_accumulators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    transaction_id VARCHAR(255) NOT NULL,
    settlement_amount DECIMAL(20, 6) NOT NULL,
    yield_accumulated DECIMAL(20, 6) DEFAULT 0,
    yield_rate DECIMAL(10, 6) NOT NULL, -- APY rate
    status VARCHAR(50) DEFAULT 'accumulating' CHECK (status IN ('accumulating', 'payout_pending', 'paid_out')),
    payout_date TIMESTAMP WITH TIME ZONE,
    payout_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounting exports table
CREATE TABLE IF NOT EXISTS accounting_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('csv', 'quickbooks')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    format VARCHAR(50) NOT NULL CHECK (format IN ('csv', 'json', 'xml')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    file_url TEXT,
    record_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_merchant_id ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_merchant_id ON subscription_plans(merchant_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant_id ON subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);

CREATE INDEX IF NOT EXISTS idx_yield_share_merchant_id ON yield_share_accumulators(merchant_id);
CREATE INDEX IF NOT EXISTS idx_yield_share_status ON yield_share_accumulators(status);
CREATE INDEX IF NOT EXISTS idx_yield_share_transaction_id ON yield_share_accumulators(transaction_id);

CREATE INDEX IF NOT EXISTS idx_accounting_exports_merchant_id ON accounting_exports(merchant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_status ON accounting_exports(status);

