import { Injectable, Logger } from '@nestjs/common';
import { 
  HealthCheck, 
  type HealthCheckResult, 
  HealthCheckService, 
  type HealthIndicatorResult
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  private readonly db: ReturnType<typeof drizzle>;
  private readonly pool: Pool;

  constructor(
    private health: HealthCheckService,
    private databaseHealth: DatabaseHealthIndicator,
  ) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(this.pool);
  }

  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDbConnection(),
      () => this.databaseHealth.isHealthy('database'),
    ]);
  }

  async checkDbConnection(): Promise<HealthIndicatorResult> {
    try {
      // Simple query to check database connection
      await this.db.execute(sql`SELECT 1`);
      return {
        database: { status: 'up' }
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      this.logger.error('Database connection check failed', err.stack);
      throw new Error(`Database connection failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
