const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createPricingTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('💰 Creating pricing experiments tables...');

    // Pricing plans
    await sql`
      CREATE TABLE IF NOT EXISTS pricing_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10, 2) NOT NULL,
        price_yearly DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        features JSONB NOT NULL,
        limits JSONB,
        is_active BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Pricing experiments
    await sql`
      CREATE TABLE IF NOT EXISTS pricing_experiments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        control_plan_id INTEGER REFERENCES pricing_plans(id),
        variant_configs JSONB NOT NULL,
        targeting_rules JSONB,
        success_metrics JSONB,
        traffic_allocation DECIMAL(5, 2) DEFAULT 50.00,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Experiment assignments
    await sql`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id SERIAL PRIMARY KEY,
        experiment_id INTEGER REFERENCES pricing_experiments(id),
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        variant_name TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        converted BOOLEAN DEFAULT false,
        converted_at TIMESTAMP,
        revenue_impact DECIMAL(10, 2),
        UNIQUE(experiment_id, organization_id)
      )
    `;

    // Pricing metrics
    await sql`
      CREATE TABLE IF NOT EXISTS pricing_metrics (
        id SERIAL PRIMARY KEY,
        experiment_id INTEGER REFERENCES pricing_experiments(id),
        variant_name TEXT NOT NULL,
        metric_date DATE NOT NULL,
        views INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0,
        average_order_value DECIMAL(10, 2),
        churn_rate DECIMAL(5, 2),
        ltv DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(experiment_id, variant_name, metric_date)
      )
    `;

    // Discount codes
    await sql`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        discount_type TEXT NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        applies_to TEXT DEFAULT 'all',
        plan_ids INTEGER[],
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP DEFAULT NOW(),
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Customer success scores
    await sql`
      CREATE TABLE IF NOT EXISTS customer_success_scores (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER UNIQUE REFERENCES organizations(id),
        health_score INTEGER DEFAULT 50,
        engagement_score INTEGER DEFAULT 50,
        feature_adoption_score INTEGER DEFAULT 50,
        support_score INTEGER DEFAULT 50,
        payment_score INTEGER DEFAULT 50,
        overall_score INTEGER GENERATED ALWAYS AS (
          (health_score + engagement_score + feature_adoption_score + support_score + payment_score) / 5
        ) STORED,
        risk_level TEXT DEFAULT 'medium',
        last_calculated TIMESTAMP DEFAULT NOW(),
        trend TEXT DEFAULT 'stable',
        factors JSONB,
        recommendations JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created pricing tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pricing_experiments_status ON pricing_experiments(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_experiment_assignments_org ON experiment_assignments(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pricing_metrics_experiment ON pricing_metrics(experiment_id, metric_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active, valid_until)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_success_risk ON customer_success_scores(risk_level)`;

    console.log('✅ Created indexes for pricing tables');

    // Insert sample pricing plans
    const plans = [
      {
        name: 'starter',
        display_name: 'Starter',
        description: 'Perfect for small teams getting started',
        price_monthly: 29,
        price_yearly: 290,
        features: ['Up to 5 users', '10 trips per month', 'Basic support', 'Mobile app'],
        limits: { users: 5, trips_per_month: 10 }
      },
      {
        name: 'professional',
        display_name: 'Professional',
        description: 'For growing teams that need more',
        price_monthly: 79,
        price_yearly: 790,
        features: ['Up to 20 users', 'Unlimited trips', 'Priority support', 'API access', 'Advanced analytics'],
        limits: { users: 20, trips_per_month: -1 },
        is_popular: true
      },
      {
        name: 'enterprise',
        display_name: 'Enterprise',
        description: 'Full platform capabilities for large organizations',
        price_monthly: 299,
        price_yearly: 2990,
        features: ['Unlimited users', 'Unlimited trips', 'Dedicated support', 'Custom integrations', 'White label options', 'SLA guarantee'],
        limits: { users: -1, trips_per_month: -1 }
      }
    ];

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      await sql`
        INSERT INTO pricing_plans (
          name, display_name, description, price_monthly, price_yearly,
          features, limits, is_popular, sort_order
        ) VALUES (
          ${plan.name}, ${plan.display_name}, ${plan.description},
          ${plan.price_monthly}, ${plan.price_yearly},
          ${JSON.stringify(plan.features)}, ${JSON.stringify(plan.limits)},
          ${plan.is_popular || false}, ${i + 1}
        )
        ON CONFLICT (name) DO NOTHING
      `;
    }

    console.log('✅ Inserted sample pricing plans');

    // Insert sample pricing experiment
    await sql`
      INSERT INTO pricing_experiments (
        name, description, type, status,
        variant_configs, success_metrics
      ) VALUES (
        'Q4 Price Test',
        'Testing 20% price increase on Professional plan',
        'price_test',
        'active',
        ${JSON.stringify({
          control: { name: 'Current Price', price_change: 0 },
          variant_a: { name: '20% Increase', price_change: 20 }
        })},
        ${JSON.stringify({
          primary: 'conversion_rate',
          secondary: ['revenue', 'churn_rate']
        })}
      )
      ON CONFLICT DO NOTHING
    `;

    // Insert sample discount codes
    const discounts = [
      { code: 'WELCOME20', description: 'New customer discount', type: 'percentage', value: 20 },
      { code: 'ANNUAL15', description: 'Annual plan discount', type: 'percentage', value: 15 },
      { code: 'TEAM50', description: 'Team plan flat discount', type: 'fixed', value: 50 }
    ];

    for (const discount of discounts) {
      await sql`
        INSERT INTO discount_codes (
          code, description, discount_type, discount_value
        ) VALUES (
          ${discount.code}, ${discount.description}, 
          ${discount.type}, ${discount.value}
        )
        ON CONFLICT (code) DO NOTHING
      `;
    }

    console.log('✅ Generated sample pricing data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating pricing tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createPricingTables();