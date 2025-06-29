import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction, Router, Application } from 'express';

declare global {
  namespace Express {
    // Augment the Express Request interface
    interface Request {
      organizationId?: string | null;
    }

    // Augment the Express Response interface
    interface Response {
    }
  }
}

// Re-export types with proper type-only exports
export type { ExpressRequest as Request };
export type { ExpressResponse as Response };
export type { NextFunction, Router, Application };
