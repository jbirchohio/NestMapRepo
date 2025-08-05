const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createEnterpriseTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creating enterprise feature tables...');

    // Travel Policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS travel_policies (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        applies_to TEXT DEFAULT 'all',
        target_departments JSONB,
        target_roles JSONB,
        target_users JSONB,
        
        -- Flight policies
        flight_class_domestic TEXT DEFAULT 'economy',
        flight_class_international TEXT DEFAULT 'economy',
        flight_booking_window INTEGER,
        flight_price_limit_domestic INTEGER,
        flight_price_limit_international INTEGER,
        preferred_airlines JSONB,
        
        -- Hotel policies
        hotel_star_rating_max INTEGER DEFAULT 4,
        hotel_price_limit_domestic INTEGER,
        hotel_price_limit_international INTEGER,
        preferred_hotel_chains JSONB,
        
        -- Ground transport policies
        ground_transport_types JSONB,
        rental_car_class TEXT DEFAULT 'economy',
        ride_share_max_class TEXT DEFAULT 'uberx',
        
        -- Meal policies
        breakfast_limit INTEGER,
        lunch_limit INTEGER,
        dinner_limit INTEGER,
        per_diem_domestic INTEGER,
        per_diem_international JSONB,
        
        -- Approval requirements
        requires_pre_approval BOOLEAN DEFAULT false,
        auto_approve_in_policy BOOLEAN DEFAULT true,
        approval_chain JSONB,
        
        -- Compliance settings
        require_business_purpose BOOLEAN DEFAULT true,
        require_cost_center BOOLEAN DEFAULT false,
        require_project_code BOOLEAN DEFAULT false,
        allowed_expense_types JSONB,
        
        -- Time restrictions
        advance_booking_required INTEGER,
        weekend_travel_allowed BOOLEAN DEFAULT false,
        holiday_travel_allowed BOOLEAN DEFAULT false,
        
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created travel_policies table');

    // Policy Violations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_violations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        policy_id INTEGER REFERENCES travel_policies(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        trip_id INTEGER REFERENCES trips(id),
        expense_id INTEGER REFERENCES expenses(id),
        booking_id INTEGER REFERENCES bookings(id),
        
        violation_type TEXT NOT NULL,
        violation_details JSONB NOT NULL,
        
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        
        justification TEXT,
        approved_by INTEGER REFERENCES users(id),
        approval_notes TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );
    `);
    console.log('✓ Created policy_violations table');

    // Expense Receipts with OCR
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_receipts (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        
        -- OCR Results
        ocr_status TEXT DEFAULT 'pending',
        ocr_confidence DECIMAL,
        ocr_extracted_data JSONB,
        ocr_raw_text TEXT,
        ocr_processed_at TIMESTAMP,
        
        verification_status TEXT DEFAULT 'unverified',
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created expense_receipts table');

    // Mileage Tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS mileage_tracking (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        
        trip_date DATE NOT NULL,
        start_location TEXT NOT NULL,
        end_location TEXT NOT NULL,
        
        -- GPS Tracking
        start_latitude DECIMAL,
        start_longitude DECIMAL,
        end_latitude DECIMAL,
        end_longitude DECIMAL,
        
        route_polyline TEXT,
        
        distance_miles DECIMAL NOT NULL,
        rate_per_mile DECIMAL NOT NULL,
        total_amount INTEGER NOT NULL,
        
        purpose TEXT NOT NULL,
        vehicle_type TEXT DEFAULT 'personal',
        
        tracking_method TEXT DEFAULT 'manual',
        
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created mileage_tracking table');

    // Traveler Tracking (Duty of Care)
    await client.query(`
      CREATE TABLE IF NOT EXISTS traveler_tracking (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        trip_id INTEGER REFERENCES trips(id) NOT NULL,
        
        current_location TEXT,
        current_latitude DECIMAL,
        current_longitude DECIMAL,
        location_updated_at TIMESTAMP,
        
        check_in_status TEXT DEFAULT 'pending',
        last_check_in TIMESTAMP,
        next_check_in_due TIMESTAMP,
        
        -- Emergency Information
        emergency_contact_notified BOOLEAN DEFAULT false,
        local_emergency_numbers JSONB,
        
        -- Health & Safety
        travel_alerts JSONB,
        
        medical_info_on_file BOOLEAN DEFAULT false,
        travel_insurance_policy TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created traveler_tracking table');

    // Travel Risk Assessments
    await client.query(`
      CREATE TABLE IF NOT EXISTS travel_risk_assessments (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        destination_country TEXT NOT NULL,
        destination_city TEXT,
        
        risk_level TEXT DEFAULT 'low',
        
        -- Risk Categories
        health_risk TEXT DEFAULT 'low',
        health_details JSONB,
        
        security_risk TEXT DEFAULT 'low',
        security_details JSONB,
        
        covid_risk TEXT DEFAULT 'low',
        covid_details JSONB,
        
        travel_advisories JSONB,
        
        last_updated TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);
    console.log('✓ Created travel_risk_assessments table');

    // Corporate Card Policies
    await client.query(`
      CREATE TABLE IF NOT EXISTS corporate_card_policies (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        card_id INTEGER REFERENCES corporate_cards(id),
        
        -- Real-time controls
        merchant_category_restrictions JSONB,
        time_restrictions JSONB,
        geographic_restrictions JSONB,
        transaction_limits JSONB,
        
        -- Automated actions
        auto_lock_rules JSONB,
        notification_settings JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created corporate_card_policies table');

    // Accounting Integrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounting_integrations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        integration_type TEXT NOT NULL,
        
        connection_status TEXT DEFAULT 'disconnected',
        last_sync TIMESTAMP,
        
        -- Field Mappings
        expense_category_mappings JSONB,
        tax_code_mappings JSONB,
        department_mappings JSONB,
        project_mappings JSONB,
        
        -- Sync Settings
        auto_sync_enabled BOOLEAN DEFAULT true,
        sync_frequency TEXT DEFAULT 'daily',
        sync_direction TEXT DEFAULT 'one_way',
        
        -- API Credentials (encrypted)
        api_credentials JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created accounting_integrations table');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_travel_policies_org ON travel_policies(organization_id);
      CREATE INDEX IF NOT EXISTS idx_policy_violations_org ON policy_violations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense ON expense_receipts(expense_id);
      CREATE INDEX IF NOT EXISTS idx_mileage_tracking_user ON mileage_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_traveler_tracking_trip ON traveler_tracking(trip_id);
      CREATE INDEX IF NOT EXISTS idx_travel_risk_country ON travel_risk_assessments(destination_country);
      CREATE INDEX IF NOT EXISTS idx_corp_card_policies_card ON corporate_card_policies(card_id);
      CREATE INDEX IF NOT EXISTS idx_accounting_int_org ON accounting_integrations(organization_id);
    `);
    console.log('✓ Created indexes');

    console.log('\n✅ All enterprise tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

createEnterpriseTables()
  .then(() => {
    console.log('Enterprise tables setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create enterprise tables:', error);
    process.exit(1);
  });