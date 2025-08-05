const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createRevenueTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating revenue tracking tables...');

    // Revenue metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS revenue_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        mrr DECIMAL(10, 2) DEFAULT 0,
        arr DECIMAL(10, 2) DEFAULT 0,
        new_mrr DECIMAL(10, 2) DEFAULT 0,
        churned_mrr DECIMAL(10, 2) DEFAULT 0,
        expansion_mrr DECIMAL(10, 2) DEFAULT 0,
        contraction_mrr DECIMAL(10, 2) DEFAULT 0,
        active_subscriptions INTEGER DEFAULT 0,
        new_customers INTEGER DEFAULT 0,
        churned_customers INTEGER DEFAULT 0,
        total_customers INTEGER DEFAULT 0,
        average_revenue_per_user DECIMAL(10, 2) DEFAULT 0,
        customer_lifetime_value DECIMAL(10, 2) DEFAULT 0,
        churn_rate DECIMAL(5, 2) DEFAULT 0,
        growth_rate DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Subscription events table
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        stripe_subscription_id TEXT,
        event_type TEXT NOT NULL,
        amount DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        plan_name TEXT,
        seats INTEGER,
        occurred_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      )
    `;

    // Payment failures table
    await sql`
      CREATE TABLE IF NOT EXISTS payment_failures (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        stripe_payment_intent_id TEXT,
        amount DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        failure_reason TEXT,
        failure_code TEXT,
        retry_count INTEGER DEFAULT 0,
        last_retry_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Stripe webhook logs
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
        id SERIAL PRIMARY KEY,
        stripe_event_id TEXT UNIQUE,
        event_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        payload JSONB,
        error_message TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Customer health scores
    await sql`
      CREATE TABLE IF NOT EXISTS customer_health_scores (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) UNIQUE,
        health_score INTEGER DEFAULT 50,
        usage_score INTEGER DEFAULT 0,
        payment_score INTEGER DEFAULT 100,
        engagement_score INTEGER DEFAULT 0,
        support_score INTEGER DEFAULT 100,
        churn_risk TEXT DEFAULT 'low',
        last_calculated_at TIMESTAMP DEFAULT NOW(),
        factors JSONB
      )
    `;

    // Revenue forecasts
    await sql`
      CREATE TABLE IF NOT EXISTS revenue_forecasts (
        id SERIAL PRIMARY KEY,
        forecast_date DATE NOT NULL,
        predicted_mrr DECIMAL(10, 2),
        confidence_level DECIMAL(5, 2),
        best_case_mrr DECIMAL(10, 2),
        worst_case_mrr DECIMAL(10, 2),
        factors JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created revenue tracking tables');

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_revenue_metrics_date ON revenue_metrics(date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON subscription_events(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscription_events_date ON subscription_events(occurred_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_failures_org ON payment_failures(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_type ON stripe_webhook_logs(event_type)`;

    console.log('✅ Created indexes for revenue tables');

    // Insert sample revenue data for demo
    const today = new Date();
    const dates = [];
    
    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    let currentMRR = 15000;
    let totalCustomers = 45;

    for (const date of dates) {
      // Simulate some growth with variance
      const growth = Math.random() * 0.03 + 0.01; // 1-4% daily growth
      const churn = Math.random() * 0.02; // 0-2% daily churn
      
      const newMRR = Math.round(currentMRR * growth);
      const churnedMRR = Math.round(currentMRR * churn);
      currentMRR = currentMRR + newMRR - churnedMRR;
      
      const newCustomers = Math.floor(Math.random() * 3) + 1;
      const churnedCustomers = Math.floor(Math.random() * 2);
      totalCustomers = totalCustomers + newCustomers - churnedCustomers;

      await sql`
        INSERT INTO revenue_metrics (
          date, mrr, arr, new_mrr, churned_mrr, 
          active_subscriptions, new_customers, churned_customers, 
          total_customers, average_revenue_per_user, churn_rate, growth_rate
        ) VALUES (
          ${date.toISOString().split('T')[0]},
          ${currentMRR},
          ${currentMRR * 12},
          ${newMRR},
          ${churnedMRR},
          ${totalCustomers},
          ${newCustomers},
          ${churnedCustomers},
          ${totalCustomers},
          ${Math.round(currentMRR / totalCustomers)},
          ${(churn * 100).toFixed(2)},
          ${(growth * 100).toFixed(2)}
        )
        ON CONFLICT (date) DO NOTHING
      `;
    }

    console.log('✅ Inserted sample revenue data');

    // Get existing organizations
    const orgs = await sql`SELECT id FROM organizations LIMIT 10`;
    
    if (orgs.length > 0) {
      // Add sample subscription events
      const eventTypes = ['subscription.created', 'subscription.upgraded', 'subscription.downgraded', 'subscription.cancelled'];
      const plans = ['starter', 'professional', 'enterprise'];
      
      for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - daysAgo);
        
        const orgId = orgs[Math.floor(Math.random() * orgs.length)].id;
        
        await sql`
          INSERT INTO subscription_events (
            organization_id, event_type, amount, plan_name, seats, occurred_at
          ) VALUES (
            ${orgId},
            ${eventTypes[Math.floor(Math.random() * eventTypes.length)]},
            ${Math.floor(Math.random() * 500) + 100},
            ${plans[Math.floor(Math.random() * plans.length)]},
            ${Math.floor(Math.random() * 10) + 1},
            ${eventDate}
          )
        `;
      }
      
      console.log('✅ Inserted sample subscription events');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating revenue tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createRevenueTables();