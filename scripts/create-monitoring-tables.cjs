const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createMonitoringTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating system monitoring tables...');

    // System metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        metric_type TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value DECIMAL(10, 2),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // API endpoint metrics
    await sql`
      CREATE TABLE IF NOT EXISTS api_metrics (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        response_time_ms INTEGER,
        status_code INTEGER,
        error_message TEXT,
        user_id INTEGER,
        organization_id INTEGER,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Third-party service status
    await sql`
      CREATE TABLE IF NOT EXISTS service_health (
        id SERIAL PRIMARY KEY,
        service_name TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'operational',
        last_check TIMESTAMP DEFAULT NOW(),
        response_time_ms INTEGER,
        error_count INTEGER DEFAULT 0,
        metadata JSONB
      )
    `;

    // Error logs
    await sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        error_type TEXT NOT NULL,
        error_message TEXT,
        stack_trace TEXT,
        user_id INTEGER,
        endpoint TEXT,
        severity TEXT DEFAULT 'error',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Database performance metrics
    await sql`
      CREATE TABLE IF NOT EXISTS database_metrics (
        id SERIAL PRIMARY KEY,
        query_count INTEGER DEFAULT 0,
        slow_query_count INTEGER DEFAULT 0,
        connection_count INTEGER DEFAULT 0,
        avg_query_time_ms DECIMAL(10, 2),
        cache_hit_ratio DECIMAL(5, 2),
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created monitoring tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint, method)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity)`;

    console.log('✅ Created indexes for monitoring tables');

    // Insert initial service health checks
    const services = [
      { name: 'stripe', display: 'Stripe API' },
      { name: 'sendgrid', display: 'SendGrid Email' },
      { name: 'openai', display: 'OpenAI API' },
      { name: 'duffel', display: 'Duffel Flights' },
      { name: 'database', display: 'PostgreSQL' },
      { name: 'redis', display: 'Redis Cache' }
    ];

    for (const service of services) {
      await sql`
        INSERT INTO service_health (service_name, status, response_time_ms)
        VALUES (${service.name}, 'operational', ${Math.floor(Math.random() * 100) + 20})
        ON CONFLICT (service_name) DO NOTHING
      `;
    }

    console.log('✅ Initialized service health checks');

    // Generate sample metrics for last 24 hours
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(timestamp.getHours() - i);
      
      // System metrics
      await sql`
        INSERT INTO system_metrics (timestamp, metric_type, metric_name, metric_value)
        VALUES 
          (${timestamp}, 'cpu', 'usage_percent', ${Math.random() * 40 + 20}),
          (${timestamp}, 'memory', 'usage_percent', ${Math.random() * 30 + 40}),
          (${timestamp}, 'disk', 'usage_percent', ${Math.random() * 20 + 30})
      `;

      // Database metrics
      await sql`
        INSERT INTO database_metrics (
          timestamp, 
          query_count, 
          slow_query_count, 
          connection_count, 
          avg_query_time_ms, 
          cache_hit_ratio
        ) VALUES (
          ${timestamp},
          ${Math.floor(Math.random() * 1000) + 500},
          ${Math.floor(Math.random() * 10)},
          ${Math.floor(Math.random() * 20) + 10},
          ${(Math.random() * 50 + 10).toFixed(2)},
          ${(Math.random() * 20 + 80).toFixed(2)}
        )
      `;
    }

    // Generate sample API metrics
    const endpoints = [
      { path: '/api/trips', method: 'GET' },
      { path: '/api/trips', method: 'POST' },
      { path: '/api/activities', method: 'GET' },
      { path: '/api/users', method: 'GET' },
      { path: '/api/auth/login', method: 'POST' }
    ];

    for (let i = 0; i < 100; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 1440)); // Last 24 hours
      
      await sql`
        INSERT INTO api_metrics (
          endpoint, method, response_time_ms, status_code, timestamp
        ) VALUES (
          ${endpoint.path},
          ${endpoint.method},
          ${Math.floor(Math.random() * 200) + 50},
          ${Math.random() > 0.95 ? 500 : 200},
          ${timestamp}
        )
      `;
    }

    console.log('✅ Generated sample monitoring data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating monitoring tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createMonitoringTables();