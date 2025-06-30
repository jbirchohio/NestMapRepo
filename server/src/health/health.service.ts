import { Injectable, Logger } from '@nestjs/common';
import { 
  HealthCheck, 
  type HealthCheckResult, 
  HealthCheckService, 
  type HealthIndicatorResult
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health.js';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  private readonly prisma: PrismaClient;

  constructor(
    private health: HealthCheckService,
    private databaseHealth: DatabaseHealthIndicator,
  ) {
    this.prisma = new PrismaClient();
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
      await this.prisma.$queryRaw`SELECT 1`;
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
    await this.prisma.$disconnect();
  }
}
