import { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Wraps an async route handler to catch any unhandled promise rejections
 * and forward them to Express's error handling middleware.
 * 
 * @template Req - The request type extending Express Request
 * @template Res - The response type extending Express Response
 */
export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
  handler: (req: Req, res: Res, next: NextFunction) => Promise<any>,
  logger?: Logger
): ExpressRequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as Req, res as Res, next)).catch((error) => {
      if (logger) {
        logger.error(`Async handler error: ${error.message}`, error.stack);
      }
      next(error);
    });
  };
}

/**
 * Type for async request handlers with proper typing
 */
export type AsyncRequestHandler<Req = Request, Res = Response> = (
  req: Req,
  res: Res,
  next: NextFunction
) => Promise<any>;
