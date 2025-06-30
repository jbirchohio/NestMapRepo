import { 
  Controller,
  Get, 
  Post, 
  Body, 
  Request, 
  UseGuards, 
  HttpStatus,
  HttpException,
  Inject,
  LoggerService,
  Req
} from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { 
  ApiOperation, 
  ApiTags, 
  ApiBearerAuth,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiServiceUnavailableResponse
} from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HealthService } from './health.service.js';
import { DatabaseHealthIndicator } from './database.health.js';
import AuthGuard from '../middleware/authenticate.js';
import { BaseController } from '../common/controllers/base.controller.js';

// Define the shape of the health check result for Swagger
type HealthCheckResponse = {
  status: string;
  info?: Record<string, any>;
  error?: Record<string, any>;
  details: Record<string, any>;
};

@ApiTags('Health')
@Controller('health')
@ApiTags('Health')
export class HealthController extends BaseController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealth: DatabaseHealthIndicator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService
  ) {
    super('HealthController');
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiOkResponse({ 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    } as const
  })
  @ApiServiceUnavailableResponse({ 
    description: 'Service is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async check(): Promise<HealthCheckResponse> {
    try {
      const result = await this.healthService.check();
      return result as HealthCheckResponse;
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new HttpException(
        { status: 'error', error: 'Service is unhealthy' },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('db')
  @HealthCheck()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Database health check (Admin only)' })
  @ApiOkResponse({ 
    description: 'Database is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    } as const
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  @ApiServiceUnavailableResponse({ 
    description: 'Database is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async checkDb(@Req() req: any): Promise<HealthCheckResponse> {
    // Verify admin access
    if (req.user?.role !== 'ADMIN') {
      throw new HttpException(
        { status: 'error', error: 'Forbidden' },
        HttpStatus.FORBIDDEN
      );
    }

    try {
      const result = await this.health.check([
        async (): Promise<HealthIndicatorResult> => 
          this.healthService.checkDbConnection()
      ]);

      return result as HealthCheckResponse;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new HttpException(
        { status: 'error', error: 'Database is unhealthy' },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('details')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed database health (Admin only)' })
  @ApiOkResponse({ 
    description: 'Detailed database health information',
    schema: {
      type: 'object',
      properties: {
        database: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            info: { type: 'object' },
            error: { type: 'object' },
            tables: { type: 'object' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async getDbDetails(@Req() req: any): Promise<{ database: any; timestamp: string }> {
    // Verify admin access
    if (req.user?.role !== 'ADMIN') {
      throw new HttpException(
        { status: 'error', error: 'Forbidden' },
        HttpStatus.FORBIDDEN
      );
    }

    try {
      const [health, stats] = await Promise.all([
        this.healthService.checkDbConnection(),
        this.databaseHealth.getTableStats(),
      ]);

      return {
        database: {
          ...health,
          tables: stats,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database details', error);
      throw new HttpException(
        { status: 'error', error: 'Failed to retrieve database details' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('query')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a read-only SQL query (Admin only)' })
  @ApiOkResponse({ 
    description: 'Query executed successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            rows: { type: 'array' },
            rowCount: { type: 'number' },
            fields: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dataTypeID: { type: 'number' },
                  format: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async query(
    @Body('sql') sql: string,
    @Req() req: any
  ): Promise<{ statusCode: number; message: string; data: any }> {
    const client = await (this.databaseHealth as any).pool.connect();
    
    try {
      // Verify admin access
      if (req.user?.role !== 'ADMIN') {
        throw new HttpException(
          { status: 'error', error: 'Forbidden' },
          HttpStatus.FORBIDDEN
        );
      }

      if (!sql || typeof sql !== 'string') {
        throw new HttpException(
          { status: 'error', error: 'SQL query is required' },
          HttpStatus.BAD_REQUEST
        );
      }

      // Prevent any write operations
      const lowerSql = sql.trim().toLowerCase();
      if (
        lowerSql.startsWith('insert') ||
        lowerSql.startsWith('update') ||
        lowerSql.startsWith('delete') ||
        lowerSql.startsWith('drop') ||
        lowerSql.startsWith('create') ||
        lowerSql.startsWith('alter') ||
        lowerSql.startsWith('truncate') ||
        lowerSql.startsWith('grant') ||
        lowerSql.startsWith('revoke') ||
        lowerSql.includes(';')
      ) {
        throw new HttpException(
          { status: 'error', error: 'Write operations are not allowed' },
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await client.query(sql);
      
      const formattedResult = {
        rowCount: result.rowCount,
        fields: result.fields.map((f: { name: string; dataTypeID: number; format: string }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
          format: f.format,
        })),
        rows: result.rows,
      };
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Query executed successfully',
        data: formattedResult
      };
    } catch (error) {
      this.logger.error('Query execution failed', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        { status: 'error', error: 'Failed to execute query' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } finally {
      client.release();
    }
  }
}
