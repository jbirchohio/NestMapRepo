import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction, Router, Application } from 'express';
import express from 'express';

declare global {
  namespace Express {
    // Augment the Express Request interface
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId: string;
        role: string;
        [key: string]: any;
      };
      organizationId?: string | null;
      [key: string]: any;
    }

    // Augment the Express Response interface
    interface Response {
      [key: string]: any;
    }
  }
}

// Re-export types with proper type-only exports
export type { ExpressRequest as Request };
export type { ExpressResponse as Response };
export type { NextFunction, Router, Application };

export default express;
