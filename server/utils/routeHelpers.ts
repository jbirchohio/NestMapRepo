import { Request, Response, NextFunction, RequestHandler } from 'express.js';

/**
 * Wraps an async route handler to ensure proper error handling and return values
 * This solves the TypeScript error TS7030: Not all code paths return a value
 */
export const asyncHandler = <
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction
  ) => Promise<any>
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (req, res, next) => {
    return Promise.resolve(handler(req as any, res, next)).catch(next);
  };
};
