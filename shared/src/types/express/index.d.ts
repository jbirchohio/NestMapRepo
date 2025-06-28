import type { JwtPayload } from '../auth';
import type { User } from '../auth/user';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

declare global {
  namespace Express {
    // Extend the Request interface with our custom properties
    interface Request<
      P = ParamsDictionary,
      ResBody = any,
      ReqBody = any,
      ReqQuery = ParsedQs,
      Locals extends Record<string, any> = Record<string, any>
    > {
      user?: User | null;
      auth?: JwtPayload;
      organizationId?: string;
      requestId?: string;
      startTime?: [number, number];
      token?: string;
      isAuthenticated?(): boolean;
      hasRole?(role: string | string[]): boolean;
      hasPermission?(permissions: string | string[]): boolean;
    }
    
    // Extend the Response interface with our custom methods
    interface Response<ResBody = any> {
      success: <T = any>(
        data: T,
        message?: string,
        statusCode?: number
      ) => Response;
      
      error: (
        message: string,
        statusCode?: number,
        errorCode?: string,
        details?: unknown
      ) => Response;
      
      paginate: <T = any>(
        data: T[],
        total: number,
        page: number,
        limit: number,
        message?: string
      ) => Response;
    }
  }
}

// Export the extended types for use in the application
export interface CustomRequest extends Express.Request {
  user: User;
  organizationId: string;
  organizationFilter?: (orgId: string | null) => boolean;
  isWhiteLabelDomain?: boolean;
  domainOrganizationId?: string | null;
}

export type AuthenticatedRequest = Express.Request & {
  user: NonNullable<Express.Request['user']>;
};

export type { Request, Response, NextFunction } from 'express';
