import { HealthIndicator, type HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);
  private pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let client;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      
      const versionResult = await client.query('SELECT version(), current_timestamp');
      const statsResult = await client.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT pg_database_size(current_database())) as db_size_bytes
      `);
      
      return this.getStatus(key, true, {
        version: versionResult.rows[0].version,
        timestamp: versionResult.rows[0].current_timestamp,
        active_connections: parseInt(statsResult.rows[0].active_connections, 10),
        max_connections: parseInt(statsResult.rows[0].max_connections, 10),
        db_size_bytes: parseInt(statsResult.rows[0].db_size_bytes, 10),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('Database health check failed', errorStack);
      throw new HealthCheckError(
        'Database connection failed',
        this.getStatus(key, false, {
          error: errorMessage,
          code: errorCode,
        })
      );
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getTableStats() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          table_schema,
          table_name,
          pg_size_pretty(pg_total_relation_size('"' || table_schema || '"."' || table_name || '"')) as size,
          pg_stat_get_live_tuples(table_schema || '.' || table_name) as row_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY pg_total_relation_size('"' || table_schema || '"."' || table_name || '"') DESC;
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
