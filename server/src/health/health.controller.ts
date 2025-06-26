import { Controller, Get, Post, Body, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service.js';
import { DatabaseHealthIndicator } from './database.health.js';
import AuthGuard from '../middleware/authenticate.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealth: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('db')
  @HealthCheck()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Database health check (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async checkDb() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => 
        this.healthService.checkDbConnection()
    ]);
  }

  @Get('details')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed database health (Admin only)' })
  @ApiResponse({ status: 200, description: 'Detailed database health information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDbDetails() {
    try {
      const [health, stats] = await Promise.all([
        this.healthService.checkDbConnection(),
        this.databaseHealth.getTableStats(),
      ]);

      return {
        status: 'ok',
        database: {
          ...health,
          tables: stats,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorCode = (error as { code?: string })?.code || 'UNKNOWN_ERROR';
      
      return {
        status: 'error',
        error: {
          message: errorMessage,
          code: errorCode,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('query')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a read-only SQL query (Admin only)' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async query(@Body('sql') sql: string) {
    // Prevent any write operations
    const lowerSql = sql.trim().toLowerCase();
    if (
      lowerSql.startsWith('insert') ||
      lowerSql.startsWith('update') ||
      lowerSql.startsWith('delete') ||
      lowerSql.startsWith('drop') ||
      lowerSql.startsWith('create') ||
      lowerSql.startsWith('alter') ||
      lowerSql.includes(';')
    ) {
      throw new Error('Write operations are not allowed');
    }

    const client = await (this.databaseHealth as any).pool.connect();
    try {
      const result = await client.query(sql);
      return {
        status: 'ok',
        rowCount: result.rowCount,
        fields: result.fields.map((f: { name: string; dataTypeID: number; format: string }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
          format: f.format,
        })),
        rows: result.rows,
      };
    } finally {
      client.release();
    }
  }
}
