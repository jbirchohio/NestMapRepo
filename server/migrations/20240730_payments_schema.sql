-- Migration: Add payment-related tables and columns
-- Created: 2024-07-30

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Amount in smallest currency unit (e.g., cents)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- pending, succeeded, failed, refunded
    payment_method_id TEXT,
    payment_intent_id TEXT,
    receipt_url TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS payments_organization_id_idx ON payments(organization_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id TEXT NOT NULL, -- External payment method ID (e.g., from Stripe)
    type VARCHAR(20) NOT NULL, -- card, bank_account, etc.
    is_default BOOLEAN NOT NULL DEFAULT false,
    details JSONB NOT NULL, -- Encrypted payment method details
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for payment_methods table
CREATE INDEX IF NOT EXISTS payment_methods_organization_id_idx ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS payment_methods_is_default_idx ON payment_methods(is_default);

-- Payment refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Amount refunded in smallest currency unit
    currency VARCHAR(3) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL, -- pending, succeeded, failed
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for payment_refunds table
CREATE INDEX IF NOT EXISTS payment_refunds_payment_id_idx ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS payment_refunds_status_idx ON payment_refunds(status);

-- Add payment_intent_id column to invoices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE invoices ADD COLUMN payment_intent_id TEXT;
        CREATE INDEX IF NOT EXISTS invoices_payment_intent_id_idx ON invoices(payment_intent_id);
    END IF;
END $$;

-- Add payment_status column to invoices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'payment_status') THEN
        ALTER TABLE invoices ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid';
        CREATE INDEX IF NOT EXISTS invoices_payment_status_idx ON invoices(payment_status);
    END IF;
END $$;

-- Add payment_metadata column to invoices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'payment_metadata') THEN
        ALTER TABLE invoices ADD COLUMN payment_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns if they don't exist
DO $$
BEGIN
    -- Payments table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at') THEN
        CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON payments
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;

    -- Payment methods table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_methods_updated_at') THEN
        CREATE TRIGGER update_payment_methods_updated_at
        BEFORE UPDATE ON payment_methods
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;
