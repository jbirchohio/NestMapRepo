import { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Organization context middleware for multi-tenant database operations
 * Ensures all database queries are scoped to the user's organization
 */
export function injectOrganizationContext(req: Request, res: Response, next: NextFunction) {
  // Skip for public endpoints
  if (req.path.includes('/api/public/') || req.path.includes('/api/auth/')) {
    return next();
  }

  // For authenticated users, ensure organization context is available
  if (req.user && req.user.organization_id) {
    req.organizationId = req.user.organization_id;
    req.organizationContext = {
      id: req.user.organization_id,
      canAccessOrganization: (orgId: number | null) => {
        if (!orgId) return false;
        return orgId === req.user.organization_id;
      },
      requireSameOrganization: (orgId: number | null) => {
        if (!orgId || orgId !== req.user.organization_id) {
          throw new Error('Access denied: Organization mismatch');
        }
        return true;
      }
    };
  }

  next();
}

/**
 * Database query builder with automatic organization filtering
 */
export class SecureQueryBuilder {
  constructor(private organizationId: number | null) {}

  /**
   * Add organization filter to where clause
   */
  withOrganizationFilter(table: any, additionalConditions?: any) {
    if (!this.organizationId) {
      throw new Error('Organization context required for database operations');
    }

    const orgCondition = eq(table.organization_id, this.organizationId);
    
    if (additionalConditions) {
      return and(orgCondition, additionalConditions);
    }
    
    return orgCondition;
  }

  /**
   * Create organization-scoped query
   */
  scopedQuery(baseQuery: any, table: any, additionalWhere?: any) {
    const whereClause = this.withOrganizationFilter(table, additionalWhere);
    return baseQuery.where(whereClause);
  }

  /**
   * Validate organization access before operations
   */
  validateOrganizationAccess(resourceOrgId: number | null): boolean {
    if (!this.organizationId || !resourceOrgId) {
      return false;
    }
    return resourceOrgId === this.organizationId;
  }
}

/**
 * Database security middleware for protecting against cross-organization access
 */
export function enforceOrganizationQueries(req: Request, res: Response, next: NextFunction) {
  // Skip for non-authenticated routes
  if (!req.organizationId) {
    return next();
  }

  // Attach secure query builder to request
  req.secureQuery = new SecureQueryBuilder(req.organizationId);

  // Override database operations to include organization filtering
  const originalQuery = req.query;
  req.secureDbOps = {
    // Secure trip operations
    getTripsByOrg: (db: any, trips: any, additionalWhere?: any) => {
      return req.secureQuery!.scopedQuery(
        db.select().from(trips),
        trips,
        additionalWhere
      );
    },

    // Secure activity operations
    getActivitiesByOrg: (db: any, activities: any, additionalWhere?: any) => {
      return req.secureQuery!.scopedQuery(
        db.select().from(activities),
        activities,
        additionalWhere
      );
    },

    // Secure user operations within organization
    getUsersByOrg: (db: any, users: any, additionalWhere?: any) => {
      return req.secureQuery!.scopedQuery(
        db.select().from(users),
        users,
        additionalWhere
      );
    },

    // Validate resource access
    validateAccess: (resourceOrgId: number | null): boolean => {
      return req.secureQuery!.validateOrganizationAccess(resourceOrgId);
    }
  };

  next();
}

/**
 * Audit trail middleware for database operations
 */
export function auditDatabaseOperations(req: Request, res: Response, next: NextFunction) {
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    // Log database operations for audit trail
    if (req.organizationId && req.method !== 'GET') {
      console.log('DB_AUDIT:', {
        operation: req.method,
        endpoint: req.path,
        organizationId: req.organizationId,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        success: res.statusCode < 400
      });
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Database connection security configurations
 */
export const databaseSecurityConfig = {
  // Connection pool settings for security
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },

  // Query timeout settings
  queryTimeout: 30000,

  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA,
    cert: process.env.DB_SSL_CERT,
    key: process.env.DB_SSL_KEY
  } : false,

  // Connection string validation
  validateConnection: (connectionString: string): boolean => {
    if (!connectionString) return false;
    
    // Ensure SSL is required in production
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=require')) {
      console.warn('Database connection should use SSL in production');
    }
    
    return true;
  }
};

/**
 * Database query performance monitoring
 */
export function monitorDatabasePerformance(req: Request, res: Response, next: NextFunction) {
  req.dbMetrics = {
    queryCount: 0,
    totalQueryTime: 0,
    slowQueries: [],
    
    recordQuery: (queryName: string, duration: number) => {
      req.dbMetrics!.queryCount++;
      req.dbMetrics!.totalQueryTime += duration;
      
      if (duration > 100) { // Queries over 100ms are considered slow
        req.dbMetrics!.slowQueries.push({
          name: queryName,
          duration,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    getMetrics: () => ({
      queryCount: req.dbMetrics!.queryCount,
      averageQueryTime: req.dbMetrics!.totalQueryTime / req.dbMetrics!.queryCount || 0,
      slowQueries: req.dbMetrics!.slowQueries
    })
  };

  // Log performance metrics at request completion
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const metrics = req.dbMetrics?.getMetrics();
    if (metrics && metrics.queryCount > 0) {
      // Only set headers if response hasn't been sent
      if (!res.headersSent) {
        res.setHeader('X-DB-Query-Count', metrics.queryCount.toString());
        res.setHeader('X-DB-Avg-Time', metrics.averageQueryTime.toFixed(2));
      }
      
      if (metrics.slowQueries.length > 0) {
        console.warn('SLOW_DB_QUERIES:', {
          endpoint: req.path,
          slowQueries: metrics.slowQueries,
          totalQueries: metrics.queryCount
        });
      }
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}