const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function enhanceFeatureFlagsWithAB() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔬 Enhancing feature flags with A/B testing capabilities...');

    // Add A/B testing columns to feature flags table
    await sql`
      ALTER TABLE feature_flags 
      ADD COLUMN IF NOT EXISTS is_experiment BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS experiment_config JSONB,
      ADD COLUMN IF NOT EXISTS variant_distribution JSONB,
      ADD COLUMN IF NOT EXISTS experiment_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS experiment_end_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS success_metrics JSONB,
      ADD COLUMN IF NOT EXISTS experiment_status TEXT DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS winner_variant TEXT
    `;

    console.log('✅ Added A/B testing columns to feature flags table');

    // Create feature flag assignments table for A/B testing
    await sql`
      CREATE TABLE IF NOT EXISTS feature_flag_assignments (
        id SERIAL PRIMARY KEY,
        feature_flag_id INTEGER REFERENCES feature_flags(id),
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        variant TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        first_exposure_at TIMESTAMP,
        conversions JSONB DEFAULT '{}',
        metadata JSONB,
        UNIQUE(feature_flag_id, user_id),
        UNIQUE(feature_flag_id, organization_id)
      )
    `;

    console.log('✅ Created feature flag assignments table');

    // Create feature flag metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS feature_flag_metrics (
        id SERIAL PRIMARY KEY,
        feature_flag_id INTEGER REFERENCES feature_flags(id),
        variant TEXT NOT NULL,
        metric_date DATE NOT NULL,
        exposures INTEGER DEFAULT 0,
        conversions JSONB DEFAULT '{}',
        errors INTEGER DEFAULT 0,
        performance_impact JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(feature_flag_id, variant, metric_date)
      )
    `;

    console.log('✅ Created feature flag metrics table');

    // Create feature flag events table
    await sql`
      CREATE TABLE IF NOT EXISTS feature_flag_events (
        id SERIAL PRIMARY KEY,
        feature_flag_id INTEGER REFERENCES feature_flags(id),
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        event_type TEXT NOT NULL,
        variant TEXT,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created feature flag events table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_assignments_flag ON feature_flag_assignments(feature_flag_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_assignments_user ON feature_flag_assignments(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_assignments_org ON feature_flag_assignments(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_metrics_flag_date ON feature_flag_metrics(feature_flag_id, metric_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_events_flag ON feature_flag_events(feature_flag_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_flag_events_created ON feature_flag_events(created_at)`;

    console.log('✅ Created indexes for A/B testing tables');

    // Update existing feature flags with experiment examples
    const experimentExamples = [
      {
        flag_name: 'new_dashboard_ui',
        experiment_config: {
          hypothesis: 'The new dashboard UI will increase user engagement by 20%',
          variants: {
            control: { name: 'Current UI', weight: 50 },
            treatment: { name: 'New UI', weight: 50 }
          },
          targeting: {
            segments: ['power_users', 'new_users'],
            percentage: 100
          }
        },
        variant_distribution: { control: 50, treatment: 50 },
        success_metrics: {
          primary: { name: 'dashboard_engagement', target: 20, type: 'percentage_increase' },
          secondary: [
            { name: 'time_on_dashboard', target: 30, type: 'percentage_increase' },
            { name: 'feature_adoption', target: 15, type: 'percentage_increase' }
          ]
        },
        is_experiment: true,
        experiment_status: 'active'
      },
      {
        flag_name: 'ai_trip_suggestions',
        experiment_config: {
          hypothesis: 'AI-powered trip suggestions will increase trip creation by 35%',
          variants: {
            control: { name: 'No Suggestions', weight: 33 },
            variant_a: { name: 'Basic AI', weight: 33 },
            variant_b: { name: 'Advanced AI', weight: 34 }
          },
          targeting: {
            segments: ['active_travelers'],
            percentage: 75
          }
        },
        variant_distribution: { control: 33, variant_a: 33, variant_b: 34 },
        success_metrics: {
          primary: { name: 'trips_created', target: 35, type: 'percentage_increase' },
          secondary: [
            { name: 'ai_suggestion_clicks', target: 50, type: 'percentage_increase' },
            { name: 'trip_quality_score', target: 10, type: 'percentage_increase' }
          ]
        },
        is_experiment: true,
        experiment_status: 'active',
        experiment_start_date: new Date(),
        experiment_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    ];

    for (const example of experimentExamples) {
      await sql`
        UPDATE feature_flags
        SET 
          is_experiment = ${example.is_experiment},
          experiment_config = ${JSON.stringify(example.experiment_config)},
          variant_distribution = ${JSON.stringify(example.variant_distribution)},
          success_metrics = ${JSON.stringify(example.success_metrics)},
          experiment_status = ${example.experiment_status},
          experiment_start_date = ${example.experiment_start_date || null},
          experiment_end_date = ${example.experiment_end_date || null}
        WHERE flag_name = ${example.flag_name}
      `;
    }

    console.log('✅ Updated feature flags with A/B testing examples');

    // Insert sample metrics
    const sampleMetrics = [
      {
        flag_name: 'new_dashboard_ui',
        variant: 'control',
        exposures: 1250,
        conversions: { dashboard_engagement: 125, time_on_dashboard: 300 }
      },
      {
        flag_name: 'new_dashboard_ui',
        variant: 'treatment',
        exposures: 1300,
        conversions: { dashboard_engagement: 195, time_on_dashboard: 420 }
      },
      {
        flag_name: 'ai_trip_suggestions',
        variant: 'control',
        exposures: 800,
        conversions: { trips_created: 40 }
      },
      {
        flag_name: 'ai_trip_suggestions',
        variant: 'variant_a',
        exposures: 810,
        conversions: { trips_created: 52 }
      },
      {
        flag_name: 'ai_trip_suggestions',
        variant: 'variant_b',
        exposures: 790,
        conversions: { trips_created: 68 }
      }
    ];

    for (const metric of sampleMetrics) {
      const flag = await sql`SELECT id FROM feature_flags WHERE flag_name = ${metric.flag_name}`;
      if (flag.length > 0) {
        await sql`
          INSERT INTO feature_flag_metrics (
            feature_flag_id, variant, metric_date, exposures, conversions
          ) VALUES (
            ${flag[0].id},
            ${metric.variant},
            CURRENT_DATE,
            ${metric.exposures},
            ${JSON.stringify(metric.conversions)}
          )
          ON CONFLICT (feature_flag_id, variant, metric_date) 
          DO UPDATE SET 
            exposures = EXCLUDED.exposures,
            conversions = EXCLUDED.conversions
        `;
      }
    }

    console.log('✅ Inserted sample A/B testing metrics');

    console.log('🚀 Feature flags enhanced with A/B testing capabilities!');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error enhancing feature flags:', error);
    await sql.end();
    process.exit(1);
  }
}

enhanceFeatureFlagsWithAB();