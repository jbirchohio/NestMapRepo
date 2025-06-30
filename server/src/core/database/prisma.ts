import { PrismaClient } from '@prisma/client';
import type { Response } from 'express';
import type { AuthUser } from '../../../express-augmentations.js';

// Global type for organization context
declare global {
  // eslint-disable-next-line no-var
  var organizationId: string | null | undefined;
}

export class PrismaService extends PrismaClient {
  private static instance: PrismaService;

  private constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Add middleware for multi-tenancy
    this.$use(async (params, next) => {
      // Skip for system models or specific operations
      if (this.shouldSkipTenantCheck(params)) {
        return next(params);
      }

      // Get organization ID from the request context
      const organizationId = this.getOrganizationId();

      // If no organization ID is available, block the operation
      if (!organizationId) {
        throw new Error('Organization ID is required for this operation');
      }

      // Add organization filter to the query
      params = this.addOrganizationFilter(params, organizationId);

      return next(params);
    });
  }

  // Singleton pattern to ensure a single PrismaClient instance
  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  // Connect to the database
  public async connect() {
    await this.$connect();
  }

  // Disconnect from the database
  public async disconnect() {
    await this.$disconnect();
  }

  private shouldSkipTenantCheck(params: any): boolean {
    // Skip for system models or specific operations
    const systemModels = ['Organization', 'User', 'UserSession', 'PasswordHistory', 'UserActivityLog', 'Invitation'];
    const isSystemModel = systemModels.includes(params.model);
    const isReadOperation = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action);
    
    return isSystemModel || isReadOperation;
  }

  private getOrganizationId(): string | null | undefined {
    // This will be set by our middleware
    return (global as any).organizationId ?? null;
  }

  private addOrganizationFilter(params: any, organizationId: string): any {
    // Skip if the model doesn't have an organizationId field
    if (!this.modelHasOrganizationField(params.model)) {
      return params;
    }

    // Add organization filter to the query
    if (['findUnique', 'findFirst', 'findMany', 'update', 'delete', 'count', 'aggregate'].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId,
      };
    } else if (params.action === 'create') {
      params.args = params.args || {};
      params.args.data = {
        ...params.args.data,
        organization: {
          connect: { id: organizationId },
        },
      };
    } else if (params.action === 'updateMany' || params.action === 'deleteMany') {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId,
      };
    }

    return params;
  }

  private modelHasOrganizationField(model: string): boolean {
    // List of models that have an organization relation
    const modelsWithOrganization = [
      'User',
      // Add other models that have an organization relation
    ];

    return modelsWithOrganization.includes(model);
  }
}

// Create and export a singleton instance
export const prisma = PrismaService.getInstance();

// Middleware to set the organization ID from the JWT token
export function prismaTenantMiddleware(
  req: Express.Request,
  _res: Response,
  next: (err?: unknown) => void
): void {
  try {
    // Get organization ID from the user object set by the auth middleware
    const organizationId = req.user?.organizationId;
    
    if (organizationId) {
      // Set organization ID in the global context for this request
      global.organizationId = organizationId;
    } else {
      global.organizationId = null;
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

// Define the shape of Prisma error we expect
interface PrismaError extends Error {
  code: string;
  meta?: unknown;
  message: string;
  clientVersion?: string;
}

// Type guard to check if an error is a Prisma error
function isPrismaError(error: unknown): error is PrismaError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'PrismaClientKnownRequestError' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

// Error handling middleware
export function prismaErrorHandler(
  err: unknown,
  _req: Express.Request,
  res: Response,
  next: (err?: unknown) => void
): void {
  // Handle Prisma errors
  if (isPrismaError(err)) {
    const { code, meta, message } = err;
    
    switch (code) {
      case 'P2002':
        // Handle unique constraint violation
        res.status(409).json({
          status: 'error',
          message: 'A record with these details already exists',
          code: 'DUPLICATE_RECORD',
          ...(process.env.NODE_ENV === 'development' && { details: meta }),
        });
        return;
        
      case 'P2025':
        // Handle record not found
        res.status(404).json({
          status: 'error',
          message: 'The requested record was not found',
          code: 'RECORD_NOT_FOUND',
        });
        return;
        
      default:
        // Handle other Prisma errors
        res.status(400).json({
          status: 'error',
          message: 'Database error',
          code: 'DATABASE_ERROR',
          ...(process.env.NODE_ENV === 'development' && {
            details: { code, meta, message },
          }),
        });
        return;
    }
  }
  
  // Pass to the default error handler if not a Prisma error
  next(err);
}
