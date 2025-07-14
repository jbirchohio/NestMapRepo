import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to automatically catch and forward errors to Express error handling middleware
 * @param fn Async route handler function
 * @returns Wrapped route handler with error handling
 */
export const asyncHandler = (fn: RequestHandler) => 
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
