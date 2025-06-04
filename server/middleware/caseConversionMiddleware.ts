import { Request, Response, NextFunction } from 'express';

/**
 * Converts camelCase keys to snake_case recursively
 */
function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    converted[snakeKey] = camelToSnake(value);
  }
  return converted;
}

/**
 * Converts snake_case keys to camelCase recursively
 */
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = snakeToCamel(value);
  }
  return converted;
}

/**
 * Middleware to convert request body from camelCase to snake_case
 * for database operations while preserving JWT auth structure
 */
export function convertRequestToSnakeCase(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    // Preserve auth-related fields in their original format
    const preservedFields = ['auth_id', 'authId', 'access_token', 'refresh_token'];
    const preserved: any = {};
    
    // Extract preserved fields
    for (const field of preservedFields) {
      if (req.body[field] !== undefined) {
        preserved[field] = req.body[field];
      }
    }
    
    // Convert the rest to snake_case
    req.body = camelToSnake(req.body);
    
    // Restore preserved fields
    Object.assign(req.body, preserved);
  }
  next();
}

/**
 * Middleware to convert response from snake_case to camelCase
 * for frontend consumption while preserving database structure
 */
export function convertResponseToCamelCase(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    if (body && typeof body === 'object') {
      // Convert to camelCase for frontend
      const convertedBody = snakeToCamel(body);
      return originalJson.call(this, convertedBody);
    }
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Combined middleware for full case conversion
 */
export function caseConversionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Convert request to snake_case
  convertRequestToSnakeCase(req, res, () => {
    // Convert response to camelCase
    convertResponseToCamelCase(req, res, next);
  });
}