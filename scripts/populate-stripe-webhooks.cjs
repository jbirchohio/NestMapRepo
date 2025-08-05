const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function populateStripeWebhooks() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('💳 Populating Stripe webhook sample data...');

    // Generate sample webhook events
    const eventTypes = [
      'payment_intent.succeeded',
      'payment_intent.failed',
      'payment_intent.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'charge.succeeded',
      'charge.failed'
    ];

    const statuses = ['processed', 'failed', 'pending', 'retrying'];
    
    // Insert events for the last 7 days
    for (let days = 0; days < 7; days++) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      // Generate 50-100 events per day
      const eventsPerDay = Math.floor(Math.random() * 50) + 50;
      
      for (let i = 0; i < eventsPerDay; i++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const status = Math.random() > 0.85 ? 'failed' : 'processed';
        const processingTime = status === 'processed' 
          ? Math.floor(Math.random() * 200) + 50 
          : Math.floor(Math.random() * 500) + 200;
        
        const eventDate = new Date(date);
        eventDate.setHours(Math.floor(Math.random() * 24));
        eventDate.setMinutes(Math.floor(Math.random() * 60));
        
        await sql`
          INSERT INTO stripe_webhook_events (
            stripe_event_id,
            type,
            livemode,
            api_version,
            created,
            received_at,
            processed_at,
            status,
            retries,
            error_message,
            response_status,
            processing_time_ms
          ) VALUES (
            ${'evt_' + Math.random().toString(36).substring(2, 15)},
            ${eventType},
            ${Math.random() > 0.3},
            '2024-11-20.acacia',
            ${eventDate},
            ${eventDate},
            ${new Date(eventDate.getTime() + processingTime)},
            ${status},
            ${status === 'failed' ? Math.floor(Math.random() * 3) : 0},
            ${status === 'failed' ? 'Connection timeout' : null},
            ${status === 'processed' ? 200 : 500},
            ${processingTime}
          )
        `;
      }
    }

    console.log('✅ Generated webhook events');

    // Update metrics for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const eventType of eventTypes) {
      const metricsResult = await sql`
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE status = 'processed') as successful_events,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
          AVG(processing_time_ms) as avg_processing_time,
          MAX(processing_time_ms) as max_processing_time,
          MIN(processing_time_ms) as min_processing_time,
          COUNT(*) FILTER (WHERE retries > 0) as retried_events
        FROM stripe_webhook_events
        WHERE type = ${eventType}
          AND created >= ${today}
      `;
      
      const metrics = metricsResult[0];
      if (metrics && metrics.total_events > 0) {
        await sql`
          INSERT INTO stripe_webhook_metrics (
            metric_date,
            event_type,
            total_events,
            successful_events,
            failed_events,
            avg_processing_time_ms,
            max_processing_time_ms,
            min_processing_time_ms,
            retried_events
          ) VALUES (
            CURRENT_DATE,
            ${eventType},
            ${metrics.total_events},
            ${metrics.successful_events},
            ${metrics.failed_events},
            ${metrics.avg_processing_time},
            ${metrics.max_processing_time},
            ${metrics.min_processing_time},
            ${metrics.retried_events}
          )
          ON CONFLICT (metric_date, event_type) 
          DO UPDATE SET
            total_events = EXCLUDED.total_events,
            successful_events = EXCLUDED.successful_events,
            failed_events = EXCLUDED.failed_events,
            avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
            max_processing_time_ms = EXCLUDED.max_processing_time_ms,
            min_processing_time_ms = EXCLUDED.min_processing_time_ms,
            retried_events = EXCLUDED.retried_events
        `;
      }
    }

    console.log('✅ Updated webhook metrics');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating webhook data:', error);
    await sql.end();
    process.exit(1);
  }
}

populateStripeWebhooks();