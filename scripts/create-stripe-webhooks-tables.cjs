const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createStripeWebhookTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('💳 Creating Stripe webhook monitoring tables...');

    // Stripe webhook events
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        livemode BOOLEAN DEFAULT false,
        api_version TEXT,
        created TIMESTAMP NOT NULL,
        received_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        status TEXT DEFAULT 'pending',
        retries INTEGER DEFAULT 0,
        error_message TEXT,
        request_headers JSONB,
        request_body JSONB,
        response_status INTEGER,
        response_body JSONB,
        metadata JSONB,
        processing_time_ms INTEGER
      )
    `;

    console.log('✅ Created stripe_webhook_events table');

    // Stripe webhook endpoints configuration
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_endpoints (
        id SERIAL PRIMARY KEY,
        endpoint_id TEXT UNIQUE,
        url TEXT NOT NULL,
        description TEXT,
        enabled_events TEXT[],
        status TEXT DEFAULT 'enabled',
        secret TEXT,
        api_version TEXT,
        livemode BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created stripe_webhook_endpoints table');

    // Stripe webhook metrics
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_metrics (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL,
        event_type TEXT NOT NULL,
        total_events INTEGER DEFAULT 0,
        successful_events INTEGER DEFAULT 0,
        failed_events INTEGER DEFAULT 0,
        avg_processing_time_ms DECIMAL(10, 2),
        max_processing_time_ms INTEGER,
        min_processing_time_ms INTEGER,
        retried_events INTEGER DEFAULT 0,
        unique_errors JSONB,
        hourly_distribution JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(metric_date, event_type)
      )
    `;

    console.log('✅ Created stripe_webhook_metrics table');

    // Stripe webhook alerts
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_alerts (
        id SERIAL PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        event_type TEXT,
        event_id TEXT,
        message TEXT NOT NULL,
        details JSONB,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by INTEGER REFERENCES users(id),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created stripe_webhook_alerts table');

    // Stripe payment objects tracking
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_payment_tracking (
        id SERIAL PRIMARY KEY,
        stripe_id TEXT UNIQUE NOT NULL,
        object_type TEXT NOT NULL,
        customer_id TEXT,
        organization_id INTEGER REFERENCES organizations(id),
        amount INTEGER,
        currency TEXT,
        status TEXT,
        description TEXT,
        metadata JSONB,
        created TIMESTAMP,
        updated TIMESTAMP,
        last_webhook_event TEXT,
        webhook_history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created stripe_payment_tracking table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created ON stripe_webhook_events(created DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_metrics_date ON stripe_webhook_metrics(metric_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_alerts_acknowledged ON stripe_webhook_alerts(acknowledged, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_payment_tracking_customer ON stripe_payment_tracking(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stripe_payment_tracking_org ON stripe_payment_tracking(organization_id)`;

    console.log('✅ Created indexes for Stripe webhook tables');

    // Insert sample webhook endpoints
    await sql`
      INSERT INTO stripe_webhook_endpoints (
        url, description, enabled_events, status
      ) VALUES (
        'https://voyageops.com/api/webhooks/stripe',
        'Main production webhook endpoint',
        ARRAY[
          'payment_intent.succeeded',
          'payment_intent.failed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ],
        'enabled'
      )
      ON CONFLICT DO NOTHING
    `;

    // Insert sample metrics
    const eventTypes = [
      'payment_intent.succeeded',
      'payment_intent.failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'invoice.payment_succeeded'
    ];

    for (const eventType of eventTypes) {
      await sql`
        INSERT INTO stripe_webhook_metrics (
          metric_date, event_type, total_events, successful_events, 
          failed_events, avg_processing_time_ms, max_processing_time_ms,
          min_processing_time_ms, retried_events
        ) VALUES (
          CURRENT_DATE,
          ${eventType},
          ${Math.floor(Math.random() * 100) + 50},
          ${Math.floor(Math.random() * 90) + 40},
          ${Math.floor(Math.random() * 10)},
          ${(Math.random() * 200 + 50).toFixed(2)},
          ${Math.floor(Math.random() * 500) + 100},
          ${Math.floor(Math.random() * 50) + 10},
          ${Math.floor(Math.random() * 5)}
        )
        ON CONFLICT (metric_date, event_type) DO NOTHING
      `;
    }

    // Insert sample alerts
    const alerts = [
      {
        alert_type: 'high_failure_rate',
        severity: 'warning',
        event_type: 'payment_intent.failed',
        message: 'High failure rate detected for payment_intent.failed events',
        details: { failure_rate: 15.5, threshold: 10 }
      },
      {
        alert_type: 'processing_delay',
        severity: 'error',
        message: 'Webhook processing delay exceeding threshold',
        details: { avg_delay_ms: 5000, threshold_ms: 3000 }
      },
      {
        alert_type: 'endpoint_disabled',
        severity: 'critical',
        message: 'Webhook endpoint has been disabled by Stripe',
        details: { endpoint_url: 'https://voyageops.com/api/webhooks/stripe', reason: 'Too many failed attempts' }
      }
    ];

    for (const alert of alerts) {
      await sql`
        INSERT INTO stripe_webhook_alerts (
          alert_type, severity, event_type, message, details
        ) VALUES (
          ${alert.alert_type},
          ${alert.severity},
          ${alert.event_type || null},
          ${alert.message},
          ${JSON.stringify(alert.details)}
        )
      `;
    }

    console.log('✅ Generated sample Stripe webhook data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating Stripe webhook tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createStripeWebhookTables();