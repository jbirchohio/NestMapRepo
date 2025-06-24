'use strict';

const TABLE_DEFINITIONS = [
  {
    name: 'users',
    columns: {
      id: { type: 'uuid', primaryKey: true, notNull: true, defaultValue: new String('gen_random_uuid()') },
      email: { type: 'string', length: 255, notNull: true, unique: true },
      username: { type: 'string', length: 50, notNull: true, unique: true },
      first_name: { type: 'string', length: 100 },
      last_name: { type: 'string', length: 100 },
      password_hash: { type: 'string', notNull: true },
      password_changed_at: { type: 'timestamp with time zone' },
      password_reset_token: { type: 'string' },
      password_reset_expires: { type: 'timestamp with time zone' },
      reset_token: { type: 'string' },
      reset_token_expires: { type: 'timestamp with time zone' },
      failed_login_attempts: { type: 'integer', notNull: true, defaultValue: 0 },
      locked_until: { type: 'timestamp with time zone' },
      mfa_secret: { type: 'string' },
      last_login_at: { type: 'timestamp with time zone' },
      last_login_ip: { type: 'string' },
      role: { type: 'user_role', notNull: true, defaultValue: 'member' },
      organization_id: { type: 'uuid', references: { table: 'organizations', field: 'id' }, onDelete: 'SET NULL' },
      email_verified: { type: 'boolean', notNull: true, defaultValue: false },
      is_active: { type: 'boolean', notNull: true, defaultValue: true },
      token_version: { type: 'integer', notNull: true, defaultValue: 0 },
      created_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') },
      updated_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') }
    },
    indexes: [
      { columns: ['locked_until'], name: 'users_locked_until_idx' },
      { columns: ['is_active'], name: 'users_is_active_idx' },
      { columns: ['is_active', 'locked_until', 'email_verified'], name: 'users_active_composite_idx' },
      { columns: ['organization_id', 'is_active', 'role'], name: 'users_org_composite_idx' }
    ]
  },
  {
    name: 'organizations',
    columns: {
      id: { type: 'uuid', primaryKey: true, notNull: true, defaultValue: new String('gen_random_uuid()') },
      name: { type: 'string', length: 255, notNull: true },
      slug: { type: 'string', length: 255, notNull: true, unique: true },
      description: { type: 'text' },
      logo_url: { type: 'string' },
      website: { type: 'string' },
      industry: { type: 'string' },
      size: { type: 'string' },
      plan: { type: 'organization_plan', notNull: true, defaultValue: 'free' },
      status: { type: 'string', notNull: true, defaultValue: 'active' },
      billing_email: { type: 'string' },
      billing_name: { type: 'string' },
      billing_address: { type: 'string' },
      billing_city: { type: 'string' },
      billing_state: { type: 'string' },
      billing_postal_code: { type: 'string' },
      billing_country: { type: 'string' },
      tax_id: { type: 'string' },
      timezone: { type: 'string', notNull: true, defaultValue: 'UTC' },
      locale: { type: 'string', notNull: true, defaultValue: 'en-US' },
      settings: { type: 'jsonb' },
      metadata: { type: 'jsonb' },
      created_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') },
      updated_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') }
    },
    indexes: [
      { columns: ['slug'], name: 'organizations_slug_idx' },
      { columns: ['status'], name: 'organizations_status_idx' },
      { columns: ['created_at'], name: 'organizations_created_at_idx' }
    ]
  }
  // Add more table definitions as needed
];

// Create custom enum types
const createEnums = async (db) => {
  await db.runSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'member', 'guest');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_plan') THEN
        CREATE TYPE organization_plan AS ENUM ('free', 'pro', 'enterprise');
      END IF;
    END
    $$;
  `);
};

// Create tables and indexes
const createTables = async (db) => {
  for (const tableDef of TABLE_DEFINITIONS) {
    // Create table
    await db.createTable(tableDef.name, tableDef.columns);
    
    // Create indexes
    for (const indexDef of (tableDef.indexes || [])) {
      await db.addIndex(tableDef.name, indexDef.name, indexDef.columns);
    }
  }
};

exports.up = async function(db) {
  await createEnums(db);
  await createTables(db);
};

exports.down = async function(db) {
  // Drop tables in reverse order to respect foreign key constraints
  for (let i = TABLE_DEFINITIONS.length - 1; i >= 0; i--) {
    await db.dropTable(TABLE_DEFINITIONS[i].name);
  }
  
  // Drop enums
  await db.runSql(`
    DROP TYPE IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS organization_plan CASCADE;
  `);
};
