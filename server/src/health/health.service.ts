import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, type HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private databaseHealth: DatabaseHealthIndicator,
  ) {}

  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.db.pingCheck('database', { timeout: 300 }),
        () => this.databaseHealth.isHealthy('database'),
      ]);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Health check failed', err.stack);
      throw error;
    }
  }

  async checkDbConnection(): Promise<{ status: string; details?: any }> {
    try {
      await this.db.pingCheck('database', { timeout: 300 });
      return { status: 'ok' };
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      this.logger.error('Database connection check failed', err.stack);
      return {
        status: 'error',
        details: {
          message: err.message,
          code: err.code,
        },
      };
    }
  }
}
