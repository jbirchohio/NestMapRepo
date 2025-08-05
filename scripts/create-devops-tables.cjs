const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createDevOpsTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating DevOps management tables...');

    // Deployment history
    await sql`
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        deployment_id TEXT UNIQUE NOT NULL,
        version TEXT NOT NULL,
        environment TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        deployed_by INTEGER REFERENCES users(id),
        deployment_type TEXT DEFAULT 'manual',
        git_commit TEXT,
        git_branch TEXT,
        rollback_from INTEGER REFERENCES deployments(id),
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        metadata JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Environment configurations
    await sql`
      CREATE TABLE IF NOT EXISTS environment_configs (
        id SERIAL PRIMARY KEY,
        environment TEXT NOT NULL UNIQUE,
        config_data JSONB NOT NULL,
        secrets_data JSONB,
        is_active BOOLEAN DEFAULT true,
        last_deployed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Database migrations
    await sql`
      CREATE TABLE IF NOT EXISTS database_migrations (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER,
        rolled_back_at TIMESTAMP,
        error_message TEXT,
        metadata JSONB
      )
    `;

    // Infrastructure resources
    await sql`
      CREATE TABLE IF NOT EXISTS infrastructure_resources (
        id SERIAL PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        provider TEXT NOT NULL,
        region TEXT,
        status TEXT DEFAULT 'active',
        configuration JSONB,
        cost_per_month DECIMAL(10, 2),
        tags JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(resource_type, resource_name, provider)
      )
    `;

    // CI/CD pipeline runs
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id SERIAL PRIMARY KEY,
        pipeline_id TEXT NOT NULL,
        pipeline_name TEXT NOT NULL,
        run_number INTEGER NOT NULL,
        status TEXT DEFAULT 'running',
        trigger_type TEXT NOT NULL,
        triggered_by INTEGER REFERENCES users(id),
        git_commit TEXT,
        git_branch TEXT,
        stages JSONB,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        duration_seconds INTEGER,
        artifacts JSONB,
        error_logs TEXT
      )
    `;

    // Service health checks
    await sql`
      CREATE TABLE IF NOT EXISTS service_health_checks (
        id SERIAL PRIMARY KEY,
        service_name TEXT NOT NULL,
        check_type TEXT NOT NULL,
        endpoint TEXT,
        status TEXT DEFAULT 'healthy',
        response_time_ms INTEGER,
        status_code INTEGER,
        error_message TEXT,
        metadata JSONB,
        checked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(service_name, check_type)
      )
    `;

    // Backup records
    await sql`
      CREATE TABLE IF NOT EXISTS backup_records (
        id SERIAL PRIMARY KEY,
        backup_id TEXT UNIQUE NOT NULL,
        backup_type TEXT NOT NULL,
        source TEXT NOT NULL,
        destination TEXT NOT NULL,
        size_bytes BIGINT,
        status TEXT DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        retention_days INTEGER DEFAULT 30,
        encrypted BOOLEAN DEFAULT true,
        metadata JSONB
      )
    `;

    // SSL certificates
    await sql`
      CREATE TABLE IF NOT EXISTS ssl_certificates (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        issuer TEXT NOT NULL,
        serial_number TEXT,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        last_renewed_at TIMESTAMP,
        certificate_data TEXT,
        private_key_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Container registry
    await sql`
      CREATE TABLE IF NOT EXISTS container_images (
        id SERIAL PRIMARY KEY,
        repository TEXT NOT NULL,
        tag TEXT NOT NULL,
        digest TEXT UNIQUE,
        size_bytes BIGINT,
        pushed_by INTEGER REFERENCES users(id),
        pushed_at TIMESTAMP DEFAULT NOW(),
        scan_status TEXT DEFAULT 'pending',
        vulnerabilities JSONB,
        metadata JSONB,
        UNIQUE(repository, tag)
      )
    `;

    // Secrets management
    await sql`
      CREATE TABLE IF NOT EXISTS secrets_vault (
        id SERIAL PRIMARY KEY,
        secret_key TEXT NOT NULL UNIQUE,
        secret_value TEXT NOT NULL,
        environment TEXT NOT NULL,
        service TEXT,
        encrypted BOOLEAN DEFAULT true,
        rotation_period_days INTEGER,
        last_rotated_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created DevOps tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_deployments_started ON deployments(started_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started ON pipeline_runs(started_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_service_health_status ON service_health_checks(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expiry ON ssl_certificates(valid_until)`;

    console.log('✅ Created indexes for DevOps tables');

    // Insert sample data
    const environments = ['production', 'staging', 'development'];
    
    // Environment configs
    for (const env of environments) {
      await sql`
        INSERT INTO environment_configs (environment, config_data, is_active)
        VALUES (
          ${env},
          ${JSON.stringify({
            node_env: env,
            api_url: `https://api-${env}.voyageops.com`,
            database_pool_size: env === 'production' ? 20 : 5,
            cache_enabled: env !== 'development',
            debug_mode: env === 'development'
          })},
          true
        )
        ON CONFLICT (environment) DO NOTHING
      `;
    }

    // Sample deployments
    const versions = ['v2.5.0', 'v2.4.9', 'v2.4.8', 'v2.4.7', 'v2.4.6'];
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - daysAgo);
      
      const duration = Math.floor(Math.random() * 300) + 60; // 1-6 minutes
      const completedAt = new Date(startedAt.getTime() + duration * 1000);
      
      await sql`
        INSERT INTO deployments (
          deployment_id,
          version,
          environment,
          status,
          deployment_type,
          git_commit,
          git_branch,
          started_at,
          completed_at,
          metadata
        ) VALUES (
          ${`deploy-${Date.now()}-${i}`},
          ${versions[Math.floor(Math.random() * versions.length)]},
          ${environments[Math.floor(Math.random() * environments.length)]},
          ${Math.random() > 0.1 ? 'success' : 'failed'},
          ${['manual', 'auto', 'rollback'][Math.floor(Math.random() * 3)]},
          ${`${Math.random().toString(36).substring(2, 9)}abcdef`},
          ${['main', 'develop', 'feature/new-feature'][Math.floor(Math.random() * 3)]},
          ${startedAt},
          ${completedAt},
          ${JSON.stringify({ build_number: i + 1000, trigger: 'GitHub Actions' })}
        )
      `;
    }

    // Infrastructure resources
    const resources = [
      { type: 'compute', name: 'api-server-prod', provider: 'AWS', region: 'us-east-1', cost: 250.00 },
      { type: 'database', name: 'postgres-prod', provider: 'AWS', region: 'us-east-1', cost: 150.00 },
      { type: 'storage', name: 's3-assets', provider: 'AWS', region: 'us-east-1', cost: 25.00 },
      { type: 'cdn', name: 'cloudfront-dist', provider: 'AWS', region: 'global', cost: 50.00 },
      { type: 'compute', name: 'worker-nodes', provider: 'AWS', region: 'us-east-1', cost: 180.00 },
      { type: 'cache', name: 'redis-cluster', provider: 'AWS', region: 'us-east-1', cost: 75.00 }
    ];

    for (const resource of resources) {
      await sql`
        INSERT INTO infrastructure_resources (
          resource_type, resource_name, provider, region, status, cost_per_month
        ) VALUES (
          ${resource.type},
          ${resource.name},
          ${resource.provider},
          ${resource.region},
          'active',
          ${resource.cost}
        )
        ON CONFLICT (resource_type, resource_name, provider) DO NOTHING
      `;
    }

    // Service health checks
    const services = [
      { name: 'api-gateway', type: 'http', endpoint: 'https://api.voyageops.com/health' },
      { name: 'database', type: 'tcp', endpoint: 'postgres:5432' },
      { name: 'redis', type: 'tcp', endpoint: 'redis:6379' },
      { name: 'worker-service', type: 'http', endpoint: 'http://worker:3000/health' },
      { name: 'email-service', type: 'http', endpoint: 'http://email:3001/health' }
    ];

    for (const service of services) {
      await sql`
        INSERT INTO service_health_checks (
          service_name, check_type, endpoint, status, response_time_ms
        ) VALUES (
          ${service.name},
          ${service.type},
          ${service.endpoint},
          ${Math.random() > 0.05 ? 'healthy' : 'unhealthy'},
          ${Math.floor(Math.random() * 200) + 20}
        )
        ON CONFLICT (service_name, check_type) DO UPDATE SET
          status = EXCLUDED.status,
          response_time_ms = EXCLUDED.response_time_ms,
          checked_at = NOW()
      `;
    }

    // Sample SSL certificates
    const domains = ['voyageops.com', 'api.voyageops.com', 'app.voyageops.com'];
    for (const domain of domains) {
      const validFrom = new Date();
      validFrom.setMonth(validFrom.getMonth() - 3);
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 9);

      await sql`
        INSERT INTO ssl_certificates (
          domain, issuer, valid_from, valid_until, auto_renew
        ) VALUES (
          ${domain},
          'Let''s Encrypt',
          ${validFrom},
          ${validUntil},
          true
        )
        ON CONFLICT (domain) DO NOTHING
      `;
    }

    // Pipeline runs
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - daysAgo);
      
      const duration = Math.floor(Math.random() * 600) + 120; // 2-12 minutes
      const completedAt = new Date(startedAt.getTime() + duration * 1000);
      
      await sql`
        INSERT INTO pipeline_runs (
          pipeline_id,
          pipeline_name,
          run_number,
          status,
          trigger_type,
          git_branch,
          started_at,
          completed_at,
          duration_seconds,
          stages
        ) VALUES (
          ${'ci-cd-pipeline'},
          ${'Build and Deploy'},
          ${1000 + i},
          ${['success', 'success', 'success', 'failed', 'running'][Math.floor(Math.random() * 5)]},
          ${['push', 'pull_request', 'schedule'][Math.floor(Math.random() * 3)]},
          ${['main', 'develop', 'feature/update'][Math.floor(Math.random() * 3)]},
          ${startedAt},
          ${completedAt},
          ${duration},
          ${JSON.stringify([
            { name: 'checkout', status: 'success', duration: 5 },
            { name: 'build', status: 'success', duration: 120 },
            { name: 'test', status: 'success', duration: 180 },
            { name: 'deploy', status: Math.random() > 0.2 ? 'success' : 'failed', duration: 60 }
          ])}
        )
      `;
    }

    console.log('✅ Generated sample DevOps data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating DevOps tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createDevOpsTables();