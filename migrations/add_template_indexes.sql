-- Indexes for template marketplace performance optimization
-- Run this migration to improve query performance

-- Index for checking if user has purchased a template (frequent query)
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_template 
ON template_purchases(buyer_id, template_id, status);

-- Index for finding all purchases by a user
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer 
ON template_purchases(buyer_id);

-- Index for finding all sales of a template
CREATE INDEX IF NOT EXISTS idx_template_purchases_template 
ON template_purchases(template_id);

-- Index for template search by status and creation date
CREATE INDEX IF NOT EXISTS idx_templates_status_created 
ON templates(status, created_at DESC);

-- Index for finding templates by user
CREATE INDEX IF NOT EXISTS idx_templates_user 
ON templates(user_id);

-- Index for trip searches (if not already exists)
CREATE INDEX IF NOT EXISTS idx_trips_user 
ON trips(user_id);

-- Index for finding trips by organization (even though always null for consumers)
CREATE INDEX IF NOT EXISTS idx_trips_org 
ON trips(organization_id);

-- Partial index for public/shared trips
CREATE INDEX IF NOT EXISTS idx_trips_public 
ON trips(is_public) 
WHERE is_public = true;

-- Index for share codes
CREATE INDEX IF NOT EXISTS idx_trips_share_code 
ON trips(share_code) 
WHERE share_code IS NOT NULL;