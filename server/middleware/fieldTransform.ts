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
  next();
}

/**
 * Middleware to transform response data from snake_case to camelCase
 * This ensures frontend receives camelCase data
 */
export function transformResponseFields(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Transform snake_case response data to camelCase for frontend
    if (data && typeof data === 'object') {
      data = snakeToCamel(data);
    }
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Combined middleware for full field transformation
 */
export function fieldTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  // Transform request
  transformRequestFields(req, res, () => {
    // Transform response
    transformResponseFields(req, res, next);
  });
}