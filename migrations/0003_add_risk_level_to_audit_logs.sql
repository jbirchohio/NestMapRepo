
-- Add risk_level column to superadmin_audit_logs table
ALTER TABLE superadmin_audit_logs 
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- Update existing records to have appropriate risk levels based on action
UPDATE superadmin_audit_logs 
SET risk_level = CASE 
  WHEN action LIKE '%DELETE%' THEN 'critical'
  WHEN action LIKE '%CREATE%' THEN 'medium'
  WHEN action LIKE '%UPDATE%' THEN 'medium'
  WHEN action LIKE '%LOGIN%' THEN 'low'
  WHEN action LIKE '%ACCESS%' THEN 'low'
  ELSE 'low'
END
WHERE risk_level IS NULL OR risk_level = 'low';
