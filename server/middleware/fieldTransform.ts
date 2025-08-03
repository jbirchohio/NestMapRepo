import { Request, Response, NextFunction } from 'express';
import { camelToSnake, snakeToCamel } from '../../shared/fieldTransforms';

/**
 * Middleware to transform request body from camelCase to snake_case
 * This allows frontend to use camelCase while backend uses snake_case
 */
export function transformRequestFields(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    // Transform camelCase request body to snake_case for database operations
    req.body = camelToSnake(req.body);
  }
  
  // Ensure user object in request has both camelCase and snake_case for compatibility
  if (req.user && typeof req.user === 'object') {
    // Keep camelCase for frontend compatibility, add snake_case for database operations
    const userWithAliases = req.user as any;
    if (userWithAliases.organizationId) {
      req.user.organization_id = userWithAliases.organizationId;
    }
    if (userWithAliases.userId) {
      userWithAliases.user_id = userWithAliases.userId;
    }
  }
  
  next();
}

/**
 * Middleware to transform response data from snake_case to camelCase
 * This ensures frontend receives camelCase data
 */
export function transformResponseFields(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    try {
      // Transform snake_case response data to camelCase for frontend
      if (data && typeof data === 'object' && !Buffer.isBuffer(data)) {
        console.log(`Transforming response for ${req.path}:`, typeof data, Array.isArray(data));
        const transformed = snakeToCamel(data);
        console.log(`Transformation successful for ${req.path}`);
        return originalJson.call(this, transformed);
      }
      return originalJson.call(this, data);
    } catch (error) {
      console.error(`Response transformation error for ${req.path}:`, error);
      console.error("Original data:", JSON.stringify(data, null, 2));
      return originalJson.call(this, data);
    }
  };
  
  next();
}

/**
 * Combined middleware for full field transformation
 */
export function fieldTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Transform request
    transformRequestFields(req, res, () => {
      // Transform response
      transformResponseFields(req, res, next);
    });
  } catch (error) {
    console.error("Field transform middleware error:", error);
    next(error);
  }
}