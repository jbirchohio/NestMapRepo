import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../../shared/src/types/auth/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organizationId?: string;
      user?: JwtPayload;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Get organization ID from JWT token or request headers
    const organizationId = this.getOrganizationIdFromRequest(req);
    
    // Set organization ID in request context for Prisma middleware
    if (organizationId) {
      req.organizationId = organizationId;
    }

    next();
  }

  private getOrganizationIdFromRequest(req: Request): string | undefined {
    // First, try to get from JWT token (set by auth middleware)
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }

    // Fallback to header (for development/testing)
    const orgHeader = req.headers['x-organization-id'];
    if (orgHeader && typeof orgHeader === 'string') {
      return orgHeader;
    }

    // If no organization ID is found, the Prisma middleware will handle the error
    return undefined;
  }
}
