import { 
  ExecutionContext, 
  Injectable, 
  Logger, 
  UnauthorizedException, 
  NotFoundException,
  Inject,
  LoggerService
} from '@nestjs/common';
import { Request } from 'express';
import { 
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ControllerResponse,
  ResponseFormatter
} from '../utils/response-formatter.util.js';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      organizationId?: string;
    }
  }
}

/**
 * Base controller that provides common functionality for all controllers
 */
@Injectable()
export abstract class BaseController {
  protected readonly logger: LoggerService;
  protected readonly responseFormatter: typeof ResponseFormatter;

  constructor(controllerName: string) {
    this.logger = new Logger(controllerName);
    this.responseFormatter = ResponseFormatter;
  }

  /**
   * Get the current user from the request
   */
  protected getCurrentUser(context: ExecutionContext): Express.User {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return request.user;
  }

  /**
   * Get the organization ID from the request
   * @throws UnauthorizedException if organization context is missing
   */
  protected getOrganizationId(context: ExecutionContext): string {
    const user = this.getCurrentUser(context);
    if (!user.organizationId) {
      throw new UnauthorizedException('Organization context required');
    }
    return user.organizationId;
  }

  /**
   * Format a successful response
   */
  protected success<T>(
    data: T, 
    message = 'Success',
    meta?: Record<string, unknown>
  ): ApiSuccessResponse<T> {
    return this.responseFormatter.success(data, message, meta);
  }

  /**
   * Format a paginated response
   */
  protected paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success'
  ): ApiPaginatedResponse<T> {
    return this.responseFormatter.paginated(data, total, page, limit, message);
  }

  /**
   * Create a controller response that can be returned from NestJS controllers
   */
  protected createResponse<T>(
    type: 'success',
    data: T,
    options?: { message?: string; statusCode?: number; meta?: Record<string, unknown> }
  ): ControllerResponse<T>;
  protected createResponse<T>(
    type: 'paginated',
    data: T[],
    options: { total: number; page: number; limit: number; message?: string; statusCode?: number }
  ): ControllerResponse<T>;
  protected createResponse<T>(
    type: 'error',
    message: string,
    options: { statusCode: number; details?: Record<string, unknown>; code?: string }
  ): ControllerResponse<T>;
  protected createResponse<T>(
    type: 'success' | 'paginated' | 'error',
    data: any,
    options: any = {}
  ): ControllerResponse<T> {
    return ResponseFormatter.createControllerResponse(type as any, data, options);
  }
}
