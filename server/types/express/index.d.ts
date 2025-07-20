import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { AuthUser } from '../../src/types/auth-user';

// Define JWTUser type for authentication
interface JWTUser {
  id: string;
  userId?: string; // For backward compatibility
  email: string;
  role: string;
  organizationId?: string | null;
}

declare global {
  namespace Express {
    // Extend the Request interface with our custom properties
    interface Request {
      /**
       * Authenticated user information
       */
      user?: JWTUser | AuthUser;
      
      /**
       * Organization ID from the request (can be in params, query, or body)
       */
      organizationId?: string;
      
      /**
       * Organization filter function for data access
       */
      organizationFilter?: (orgId: string | null) => boolean;
      
      /**
       * Domain organization ID for white-label domains
       */
      domainOrganizationId?: string;
      
      /**
       * Whether the request is from a white-label domain
       */
      isWhiteLabelDomain?: boolean;
      
      /**
       * Analytics scope for the request
       */
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
      
      /**
       * Organization context for multi-tenant isolation
       */
      organizationContext?: {
        organizationId: string;
        isWhiteLabelDomain: boolean;
        domainOrganizationId?: string;
      };
      
      /**
       * Request ID for tracing
       */
      requestId?: string;
      
      /**
       * Request start time for performance measurement
       */
      startTime?: [number, number];
      
      /**
       * Raw token string if using token-based auth
       */
      token?: string;
      
      /**
       * Response metrics for monitoring
       */
      responseMetrics?: {
        startTime: [number, number];
        endTime?: [number, number];
        processingTime?: number;
        dbQueries?: number;
        cacheHits?: number;
        cacheMisses?: number;
      };
      
      /**
       * Unified monitoring metrics
       */
      unifiedMetrics?: {
        queries: number;
        cacheHits: number;
        cacheMisses: number;
        errors: number;
        startTime: [number, number];
      };
      
      /**
       * Track query function for monitoring
       */
      trackQuery?: (query: string, duration: number) => void;
    }
    
    // Extend the Response interface with our custom methods
    interface Response {
      /**
       * Send a success response with data
       */
      success?: <T = any>(
        data: T,
        message?: string,
        statusCode?: number
      ) => Response;
      
      /**
       * Send an error response
       */
      error?: (
        message: string,
        statusCode?: number,
        errorCode?: string,
        details?: any
      ) => Response;
      
      /**
       * Send a paginated response
       */
      paginate?: <T = any>(
        data: T[],
        total: number,
        page: number,
        limit: number,
        message?: string
      ) => Response;
    }
  }
}

// Also extend the express-serve-static-core module for compatibility
declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTUser | AuthUser;
    organizationId?: string;
    organizationFilter?: (orgId: string | null) => boolean;
    domainOrganizationId?: string;
    isWhiteLabelDomain?: boolean;
    analyticsScope?: {
      organizationId: string;
      startDate?: Date;
      endDate?: Date;
    };
    organizationContext?: {
      organizationId: string;
      isWhiteLabelDomain: boolean;
      domainOrganizationId?: string;
    };
    requestId?: string;
    startTime?: [number, number];
    token?: string;
    responseMetrics?: {
      startTime: [number, number];
      endTime?: [number, number];
      processingTime?: number;
      dbQueries?: number;
      cacheHits?: number;
      cacheMisses?: number;
    };
    unifiedMetrics?: {
      queries: number;
      cacheHits: number;
      cacheMisses: number;
      errors: number;
      startTime: [number, number];
    };
    trackQuery?: (query: string, duration: number) => void;
  }
}

export {};
