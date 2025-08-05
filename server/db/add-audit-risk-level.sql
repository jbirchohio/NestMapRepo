-- Add risk_level column to superadmin_audit_logs table
ALTER TABLE superadmin_audit_logs ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low';