-- Add unique constraint to prevent duplicate payment processing
ALTER TABLE template_purchases 
ADD CONSTRAINT unique_payment_intent 
UNIQUE (stripe_payment_intent_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_purchases_payment_intent 
ON template_purchases(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add composite index for user purchase checks
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_template 
ON template_purchases(buyer_id, template_id, status);

-- Add index for seller earnings lookups
CREATE INDEX IF NOT EXISTS idx_template_purchases_seller 
ON template_purchases(seller_id, status, purchased_at DESC);

-- Add status fields to trips table for revocation handling
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS source_template_id INTEGER REFERENCES templates(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS frozen_reason TEXT;

-- Add index for finding trips created from templates
CREATE INDEX IF NOT EXISTS idx_trips_source_template 
ON trips(source_template_id, user_id) 
WHERE source_template_id IS NOT NULL;

-- Add missing fields to template_purchases if they don't exist
ALTER TABLE template_purchases
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES trips(id);

-- Add index for webhook processing
CREATE INDEX IF NOT EXISTS idx_template_purchases_status 
ON template_purchases(status, purchased_at DESC);