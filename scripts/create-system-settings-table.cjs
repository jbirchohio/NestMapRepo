const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createSystemSettingsTable() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating system_settings table...');

    // Create system_settings table
    await sql`
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
      )
    `;

    console.log('✅ Created system_settings table');

    // Insert default settings
    const defaultSettings = [
      // API Configuration
      { setting_key: 'stripe_secret_key', setting_value: '', setting_type: 'string', category: 'api', description: 'Stripe API secret key', is_sensitive: true },
      { setting_key: 'sendgrid_api_key', setting_value: '', setting_type: 'string', category: 'api', description: 'SendGrid API key for email', is_sensitive: true },
      { setting_key: 'openai_api_key', setting_value: '', setting_type: 'string', category: 'api', description: 'OpenAI API key for AI features', is_sensitive: true },
      { setting_key: 'duffel_api_key', setting_value: '', setting_type: 'string', category: 'api', description: 'Duffel API key for flight search', is_sensitive: true },
      { setting_key: 'mapbox_api_key', setting_value: '', setting_type: 'string', category: 'api', description: 'Mapbox API key for maps', is_sensitive: true },
      
      // Email Settings
      { setting_key: 'smtp_host', setting_value: 'smtp.sendgrid.net', setting_type: 'string', category: 'email', description: 'SMTP server host', is_sensitive: false },
      { setting_key: 'smtp_port', setting_value: '587', setting_type: 'number', category: 'email', description: 'SMTP server port', is_sensitive: false },
      { setting_key: 'smtp_username', setting_value: '', setting_type: 'string', category: 'email', description: 'SMTP username', is_sensitive: true },
      { setting_key: 'smtp_password', setting_value: '', setting_type: 'string', category: 'email', description: 'SMTP password', is_sensitive: true },
      { setting_key: 'from_email', setting_value: 'no-reply@voyageops.com', setting_type: 'string', category: 'email', description: 'Default from email address', is_sensitive: false },
      { setting_key: 'support_email', setting_value: 'support@voyageops.com', setting_type: 'string', category: 'email', description: 'Support email address', is_sensitive: false },
      
      // Security Settings
      { setting_key: 'rate_limit_requests', setting_value: '100', setting_type: 'number', category: 'security', description: 'Rate limit requests per minute', is_sensitive: false },
      { setting_key: 'rate_limit_window', setting_value: '60', setting_type: 'number', category: 'security', description: 'Rate limit window in seconds', is_sensitive: false },
      { setting_key: 'allowed_cors_origins', setting_value: 'http://localhost:5000,http://localhost:3000', setting_type: 'string', category: 'security', description: 'Allowed CORS origins (comma separated)', is_sensitive: false },
      { setting_key: 'session_timeout', setting_value: '86400', setting_type: 'number', category: 'security', description: 'Session timeout in seconds', is_sensitive: false },
      { setting_key: 'max_login_attempts', setting_value: '5', setting_type: 'number', category: 'security', description: 'Maximum login attempts before lockout', is_sensitive: false },
      { setting_key: 'lockout_duration', setting_value: '900', setting_type: 'number', category: 'security', description: 'Account lockout duration in seconds', is_sensitive: false },
      
      // Platform Defaults
      { setting_key: 'default_trial_days', setting_value: '14', setting_type: 'number', category: 'platform', description: 'Default trial period in days', is_sensitive: false },
      { setting_key: 'default_organization_seats', setting_value: '5', setting_type: 'number', category: 'platform', description: 'Default seats for new organizations', is_sensitive: false },
      { setting_key: 'default_storage_gb', setting_value: '10', setting_type: 'number', category: 'platform', description: 'Default storage in GB per organization', is_sensitive: false },
      { setting_key: 'enable_signups', setting_value: 'true', setting_type: 'boolean', category: 'platform', description: 'Enable public signups', is_sensitive: false },
      { setting_key: 'require_email_verification', setting_value: 'true', setting_type: 'boolean', category: 'platform', description: 'Require email verification', is_sensitive: false },
      
      // Maintenance
      { setting_key: 'maintenance_mode', setting_value: 'false', setting_type: 'boolean', category: 'maintenance', description: 'Enable maintenance mode', is_sensitive: false },
      { setting_key: 'maintenance_message', setting_value: 'VoyageOps is undergoing scheduled maintenance. We\'ll be back shortly!', setting_type: 'string', category: 'maintenance', description: 'Maintenance mode message', is_sensitive: false },
      { setting_key: 'backup_enabled', setting_value: 'true', setting_type: 'boolean', category: 'maintenance', description: 'Enable automated backups', is_sensitive: false },
      { setting_key: 'backup_frequency', setting_value: 'daily', setting_type: 'string', category: 'maintenance', description: 'Backup frequency (daily, weekly)', is_sensitive: false },
      { setting_key: 'backup_retention_days', setting_value: '30', setting_type: 'number', category: 'maintenance', description: 'Backup retention in days', is_sensitive: false },
      
      // Performance
      { setting_key: 'cache_enabled', setting_value: 'true', setting_type: 'boolean', category: 'performance', description: 'Enable caching', is_sensitive: false },
      { setting_key: 'cache_ttl', setting_value: '3600', setting_type: 'number', category: 'performance', description: 'Cache TTL in seconds', is_sensitive: false },
      { setting_key: 'max_upload_size_mb', setting_value: '100', setting_type: 'number', category: 'performance', description: 'Maximum upload size in MB', is_sensitive: false },
      { setting_key: 'database_pool_size', setting_value: '10', setting_type: 'number', category: 'performance', description: 'Database connection pool size', is_sensitive: false },
      
      // White Label Defaults
      { setting_key: 'default_primary_color', setting_value: '#3B82F6', setting_type: 'string', category: 'branding', description: 'Default primary brand color', is_sensitive: false },
      { setting_key: 'default_logo_url', setting_value: '/logo.svg', setting_type: 'string', category: 'branding', description: 'Default logo URL', is_sensitive: false },
      { setting_key: 'platform_name', setting_value: 'VoyageOps', setting_type: 'string', category: 'branding', description: 'Platform name', is_sensitive: false },
      { setting_key: 'platform_tagline', setting_value: 'Enterprise Travel Management', setting_type: 'string', category: 'branding', description: 'Platform tagline', is_sensitive: false }
    ];

    for (const setting of defaultSettings) {
      await sql`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_sensitive)
        VALUES (${setting.setting_key}, ${setting.setting_value}, ${setting.setting_type}, ${setting.category}, ${setting.description}, ${setting.is_sensitive})
        ON CONFLICT (setting_key) DO NOTHING
      `;
    }

    console.log(`✅ Inserted ${defaultSettings.length} default system settings`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating system settings:', error);
    await sql.end();
    process.exit(1);
  }
}

createSystemSettingsTable();