import { Controller, Get, UseGuards, Post, Body, HttpStatus } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  HealthCheckResult,
  HealthCheckError,
  TypeOrmHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './database.health';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Database health check (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async checkDb() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => 
        this.db.pingCheck('database', { timeout: 1000 })
    ]);
  }

  @Get('details')
  @UseGuards(AuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Detailed database health (Admin only)' })
  @ApiResponse({ status: 200, description: 'Detailed database health information' })
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
    } catch (error) {
      return {
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('query')
  @UseGuards(AuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Execute a read-only SQL query (Admin only)' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
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

    const client = await this.databaseHealth['pool'].connect();
    try {
      const result = await client.query(sql);
      return {
        status: 'ok',
        rowCount: result.rowCount,
        fields: result.fields.map(f => ({
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
