import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
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

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private shouldSkipTenantCheck(params: any): boolean {
    // Skip for system models or specific operations
    const systemModels = ['Organization', 'User', 'UserSession', 'PasswordHistory', 'UserActivityLog', 'Invitation'];
    const isSystemModel = systemModels.includes(params.model);
    const isReadOperation = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action);
    
    return isSystemModel || isReadOperation;
  }

  private getOrganizationId(): string | undefined {
    // In a real implementation, this would get the organization ID from the request context
    // For now, we'll return undefined to simulate a missing organization ID
    return undefined;
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
