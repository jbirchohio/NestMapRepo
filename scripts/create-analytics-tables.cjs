const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createAnalyticsTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating analytics tables...');

    // User behavior analytics
    await sql`
      CREATE TABLE IF NOT EXISTS user_analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        event_type TEXT NOT NULL,
        event_name TEXT NOT NULL,
        event_properties JSONB,
        page_url TEXT,
        referrer_url TEXT,
        user_agent TEXT,
        ip_address TEXT,
        session_id TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Feature usage analytics
    await sql`
      CREATE TABLE IF NOT EXISTS feature_usage (
        id SERIAL PRIMARY KEY,
        feature_name TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        usage_count INTEGER DEFAULT 1,
        last_used TIMESTAMP DEFAULT NOW(),
        metadata JSONB,
        date DATE DEFAULT CURRENT_DATE,
        UNIQUE(feature_name, user_id, date)
      )
    `;

    // Conversion funnel analytics
    await sql`
      CREATE TABLE IF NOT EXISTS conversion_funnels (
        id SERIAL PRIMARY KEY,
        funnel_name TEXT NOT NULL,
        step_name TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        completed BOOLEAN DEFAULT false,
        time_spent_seconds INTEGER,
        session_id TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Performance analytics
    await sql`
      CREATE TABLE IF NOT EXISTS performance_analytics (
        id SERIAL PRIMARY KEY,
        metric_type TEXT NOT NULL,
        page_url TEXT,
        load_time_ms INTEGER,
        time_to_first_byte_ms INTEGER,
        dom_content_loaded_ms INTEGER,
        first_contentful_paint_ms INTEGER,
        largest_contentful_paint_ms INTEGER,
        user_id INTEGER REFERENCES users(id),
        session_id TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Business metrics
    await sql`
      CREATE TABLE IF NOT EXISTS business_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value DECIMAL(20, 2),
        metric_type TEXT,
        organization_id INTEGER REFERENCES organizations(id),
        metadata JSONB,
        UNIQUE(date, metric_name, organization_id)
      )
    `;

    // User segments
    await sql`
      CREATE TABLE IF NOT EXISTS user_segments (
        id SERIAL PRIMARY KEY,
        segment_name TEXT NOT NULL UNIQUE,
        segment_description TEXT,
        segment_rules JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // User segment membership
    await sql`
      CREATE TABLE IF NOT EXISTS user_segment_membership (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        segment_id INTEGER REFERENCES user_segments(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, segment_id)
      )
    `;

    // A/B test definitions
    await sql`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id SERIAL PRIMARY KEY,
        test_name TEXT NOT NULL UNIQUE,
        test_description TEXT,
        feature_flag_id INTEGER,
        variants JSONB NOT NULL,
        traffic_allocation JSONB,
        status TEXT DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // A/B test assignments
    await sql`
      CREATE TABLE IF NOT EXISTS ab_test_assignments (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES ab_tests(id),
        user_id INTEGER REFERENCES users(id),
        variant_name TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(test_id, user_id)
      )
    `;

    // A/B test results
    await sql`
      CREATE TABLE IF NOT EXISTS ab_test_results (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES ab_tests(id),
        variant_name TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value DECIMAL(20, 2),
        sample_size INTEGER,
        confidence_level DECIMAL(5, 2),
        is_significant BOOLEAN DEFAULT false,
        calculated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created analytics tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_analytics_timestamp ON user_analytics(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_analytics_event ON user_analytics(event_type, event_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON feature_usage(date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversion_funnels_funnel ON conversion_funnels(funnel_name, user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_performance_analytics_timestamp ON performance_analytics(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test ON ab_test_assignments(test_id)`;

    console.log('✅ Created indexes for analytics tables');

    // Insert sample user segments
    const segments = [
      {
        name: 'Power Users',
        description: 'Users who use the platform frequently',
        rules: { min_sessions_per_week: 5, min_features_used: 10 }
      },
      {
        name: 'Enterprise Customers',
        description: 'Organizations on enterprise plans',
        rules: { plan_type: 'enterprise', min_users: 10 }
      },
      {
        name: 'At Risk',
        description: 'Users showing signs of churn',
        rules: { days_since_last_login: 14, usage_decline_percent: 50 }
      },
      {
        name: 'New Users',
        description: 'Users who signed up in the last 7 days',
        rules: { days_since_signup: 7 }
      }
    ];

    for (const segment of segments) {
      await sql`
        INSERT INTO user_segments (segment_name, segment_description, segment_rules)
        VALUES (${segment.name}, ${segment.description}, ${JSON.stringify(segment.rules)})
        ON CONFLICT (segment_name) DO NOTHING
      `;
    }

    console.log('✅ Inserted sample user segments');

    // Generate sample analytics data
    const eventTypes = [
      { type: 'page_view', names: ['dashboard', 'trips', 'settings', 'profile'] },
      { type: 'feature_use', names: ['create_trip', 'add_activity', 'invite_user', 'export_data'] },
      { type: 'user_action', names: ['login', 'logout', 'search', 'filter'] }
    ];

    const features = [
      'trip_planning', 'activity_management', 'team_collaboration', 
      'reporting', 'integrations', 'mobile_app', 'notifications'
    ];

    // Get some users for sample data
    const users = await sql`SELECT id, organization_id FROM users LIMIT 20`;
    
    if (users.length > 0) {
      // Generate user analytics events
      for (let i = 0; i < 100; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const eventName = eventType.names[Math.floor(Math.random() * eventType.names.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysAgo);

        await sql`
          INSERT INTO user_analytics (
            user_id, organization_id, event_type, event_name, 
            event_properties, session_id, timestamp
          ) VALUES (
            ${user.id},
            ${user.organization_id},
            ${eventType.type},
            ${eventName},
            ${JSON.stringify({ source: 'web', duration: Math.floor(Math.random() * 300) })},
            ${`session_${Math.random().toString(36).substr(2, 9)}`},
            ${timestamp}
          )
        `;
      }

      // Generate feature usage data
      for (const feature of features) {
        for (let i = 0; i < 10; i++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const daysAgo = Math.floor(Math.random() * 30);
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);

          await sql`
            INSERT INTO feature_usage (
              feature_name, user_id, organization_id, usage_count, date
            ) VALUES (
              ${feature},
              ${user.id},
              ${user.organization_id},
              ${Math.floor(Math.random() * 20) + 1},
              ${date.toISOString().split('T')[0]}
            )
            ON CONFLICT (feature_name, user_id, date) 
            DO UPDATE SET usage_count = feature_usage.usage_count + 1
          `;
        }
      }

      // Generate conversion funnel data
      const funnels = [
        { name: 'Onboarding', steps: ['signup', 'profile_setup', 'first_trip', 'invite_team'] },
        { name: 'Trip Creation', steps: ['create_trip', 'add_details', 'add_activities', 'share'] }
      ];

      for (const funnel of funnels) {
        for (let i = 0; i < 20; i++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
          let completed = true;

          for (let j = 0; j < funnel.steps.length; j++) {
            // Each step has decreasing probability of completion
            if (Math.random() > 0.8 - (j * 0.1)) {
              completed = false;
              break;
            }

            await sql`
              INSERT INTO conversion_funnels (
                funnel_name, step_name, step_order, user_id, 
                organization_id, completed, session_id
              ) VALUES (
                ${funnel.name},
                ${funnel.steps[j]},
                ${j + 1},
                ${user.id},
                ${user.organization_id},
                ${completed},
                ${sessionId}
              )
            `;
          }
        }
      }

      console.log('✅ Generated sample analytics data');
    }

    // Generate business metrics
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const metrics = [
        { name: 'daily_active_users', value: Math.floor(Math.random() * 500) + 100 },
        { name: 'new_signups', value: Math.floor(Math.random() * 50) + 10 },
        { name: 'trips_created', value: Math.floor(Math.random() * 100) + 20 },
        { name: 'activities_added', value: Math.floor(Math.random() * 200) + 50 },
        { name: 'api_calls', value: Math.floor(Math.random() * 10000) + 1000 },
        { name: 'conversion_rate', value: (Math.random() * 20 + 5).toFixed(2) }
      ];

      for (const metric of metrics) {
        await sql`
          INSERT INTO business_metrics (date, metric_name, metric_value, metric_type)
          VALUES (${dateStr}, ${metric.name}, ${metric.value}, 'platform')
          ON CONFLICT (date, metric_name, organization_id) DO NOTHING
        `;
      }
    }

    console.log('✅ Generated business metrics');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating analytics tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createAnalyticsTables();