-- Add missing payout_method column to creator_balances table
ALTER TABLE creator_balances 
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'paypal';

-- Add any other missing columns while we're at it
ALTER TABLE creator_balances 
ADD COLUMN IF NOT EXISTS lifetime_earnings DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE creator_balances 
ADD COLUMN IF NOT EXISTS lifetime_payouts DECIMAL(10, 2) DEFAULT 0;

-- Ensure the column names match the schema
ALTER TABLE creator_balances 
RENAME COLUMN total_earned TO lifetime_earnings IF EXISTS;

ALTER TABLE creator_balances 
RENAME COLUMN total_withdrawn TO lifetime_payouts IF EXISTS;