const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createAuditTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating audit trail tables...');

    // Main audit logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        organization_id INTEGER,
        action_type TEXT NOT NULL,
        action_category TEXT NOT NULL,
        resource_type TEXT,
        resource_id INTEGER,
        resource_name TEXT,
        changes JSONB,
        metadata JSONB,
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Admin actions table for superadmin-specific actions
    await sql`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        target_name TEXT,
        severity TEXT DEFAULT 'info',
        details JSONB,
        ip_address TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Data access logs for compliance
    await sql`
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        accessed_table TEXT NOT NULL,
        accessed_records INTEGER DEFAULT 1,
        access_type TEXT NOT NULL,
        query_hash TEXT,
        response_time_ms INTEGER,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Security events table
    await sql`
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        user_id INTEGER,
        ip_address TEXT,
        details JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by INTEGER,
        resolved_at TIMESTAMP,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Configuration changes table
    await sql`
      CREATE TABLE IF NOT EXISTS config_changes (
        id SERIAL PRIMARY KEY,
        changed_by INTEGER NOT NULL,
        config_type TEXT NOT NULL,
        config_key TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created audit trail tables');

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type, action_category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, severity)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_config_changes_timestamp ON config_changes(timestamp DESC)`;

    console.log('✅ Created indexes for audit tables');

    // Insert sample audit data
    const actionTypes = [
      { type: 'CREATE', category: 'ORGANIZATION', resource: 'organization' },
      { type: 'UPDATE', category: 'USER', resource: 'user' },
      { type: 'DELETE', category: 'TRIP', resource: 'trip' },
      { type: 'LOGIN', category: 'AUTH', resource: null },
      { type: 'LOGOUT', category: 'AUTH', resource: null },
      { type: 'UPDATE', category: 'SETTINGS', resource: 'feature_flag' },
      { type: 'CREATE', category: 'BILLING', resource: 'subscription' },
      { type: 'VIEW', category: 'DATA', resource: 'report' }
    ];

    const now = new Date();
    
    // Generate audit logs for last 7 days
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(Math.floor(Math.random() * 24));
      
      const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      
      await sql`
        INSERT INTO audit_logs (
          user_id, organization_id, action_type, action_category, 
          resource_type, resource_id, resource_name, ip_address, timestamp
        ) VALUES (
          ${Math.floor(Math.random() * 10) + 1},
          ${Math.floor(Math.random() * 5) + 1},
          ${action.type},
          ${action.category},
          ${action.resource},
          ${action.resource ? Math.floor(Math.random() * 100) + 1 : null},
          ${action.resource ? `${action.resource}_${Math.floor(Math.random() * 100)}` : null},
          ${`192.168.1.${Math.floor(Math.random() * 255)}`},
          ${timestamp}
        )
      `;
    }

    // Generate admin actions
    const adminActions = [
      'feature_flag.toggle',
      'organization.suspend',
      'user.impersonate',
      'system.backup',
      'billing.refund',
      'security.reset_password'
    ];

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      await sql`
        INSERT INTO admin_actions (
          admin_id, action, target_type, target_id, severity, ip_address, timestamp
        ) VALUES (
          1,
          ${adminActions[Math.floor(Math.random() * adminActions.length)]},
          ${['user', 'organization', 'system'][Math.floor(Math.random() * 3)]},
          ${Math.floor(Math.random() * 50) + 1},
          ${['info', 'warning', 'critical'][Math.floor(Math.random() * 3)]},
          ${`10.0.0.${Math.floor(Math.random() * 255)}`},
          ${timestamp}
        )
      `;
    }

    // Generate security events
    const securityEvents = [
      { type: 'failed_login', severity: 'low' },
      { type: 'suspicious_activity', severity: 'medium' },
      { type: 'unauthorized_access', severity: 'high' },
      { type: 'brute_force_attempt', severity: 'critical' },
      { type: 'password_reset', severity: 'info' }
    ];

    for (let i = 0; i < 15; i++) {
      const event = securityEvents[Math.floor(Math.random() * securityEvents.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      await sql`
        INSERT INTO security_events (
          event_type, severity, user_id, ip_address, resolved, timestamp
        ) VALUES (
          ${event.type},
          ${event.severity},
          ${Math.floor(Math.random() * 10) + 1},
          ${`${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`},
          ${Math.random() > 0.3},
          ${timestamp}
        )
      `;
    }

    console.log('✅ Generated sample audit data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating audit tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createAuditTables();