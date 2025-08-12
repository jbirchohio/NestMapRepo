-- Add unique constraints to prevent duplicate share codes

-- Trips table already has unique constraint on share_code in schema
-- Ensure it exists in database
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trips_share_code_unique'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_share_code_unique UNIQUE (share_code);
  END IF;
END $$;

-- Template shares table has unique constraint on share_code in schema
-- Ensure it exists in database
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'template_shares_share_code_unique'
  ) THEN
    ALTER TABLE template_shares ADD CONSTRAINT template_shares_share_code_unique UNIQUE (share_code);
  END IF;
END $$;

-- Add index for performance on share_code lookups
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_shares_share_code ON template_shares(share_code);