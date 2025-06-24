import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';

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
    } catch (error) {
      this.logger.error('Health check failed', error.stack);
      throw error;
    }
  }

  async checkDbConnection(): Promise<{ status: string; details?: any }> {
    try {
      await this.db.pingCheck('database', { timeout: 300 });
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Database connection check failed', error.stack);
      return {
        status: 'error',
        details: {
          message: error.message,
          code: error.code,
        },
      };
    }
  }
}
