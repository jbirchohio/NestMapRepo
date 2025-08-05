-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'string',
  category TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER
);

-- Insert minimal default settings for consumer app
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_sensitive) VALUES
  -- Core settings
  ('platform_name', 'Remvana', 'string', 'branding', 'Platform name', false),
  ('platform_tagline', 'Plan Your Perfect Trip', 'string', 'branding', 'Platform tagline', false),
  ('support_email', 'support@remvana.app', 'string', 'platform', 'Support email address', false),
  
  -- Security
  ('rate_limit_requests', '100', 'number', 'security', 'Rate limit requests per minute', false),
  ('rate_limit_window', '60', 'number', 'security', 'Rate limit window in seconds', false),
  ('session_timeout', '86400', 'number', 'security', 'Session timeout in seconds', false),
  
  -- Platform
  ('enable_signups', 'true', 'boolean', 'platform', 'Enable public signups', false),
  ('require_email_verification', 'false', 'boolean', 'platform', 'Require email verification', false),
  ('maintenance_mode', 'false', 'boolean', 'maintenance', 'Enable maintenance mode', false),
  ('maintenance_message', 'Remvana is undergoing scheduled maintenance. We''ll be back shortly!', 'string', 'maintenance', 'Maintenance mode message', false)
ON CONFLICT (setting_key) DO NOTHING;