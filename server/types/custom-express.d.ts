// Import the base Express types
import type { Response, NextFunction, Request as ExpressRequest, RequestHandler as ExpressRequestHandler } from 'express';

declare global {
  namespace Express {
    // Extend the Express Request type with our custom properties
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string | null;
      };
      // Add other custom properties as needed
      cookies: {
        [key: string]: string | undefined;
      };
      // Add missing Express request properties that we use
      params: Record<string, string>;
      query: Record<string, string | string[] | undefined>;
      body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
      // Add other Express request methods we use
      get(name: string): string | undefined;
      header(name: string): string | undefined;
      accepts(types: string | string[]): string | false | string[];
      // Add other Express request properties
      method: string;
      url: string;
      headers: Record<string, string | string[] | undefined>;
    }
  }
}

// Export the custom request type for use in route handlers
export interface CustomRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  };
  cookies: {
    [key: string]: string | undefined;
  };
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

// Re-export the types for easy importing
export { Response, NextFunction };
export type Request = CustomRequest;
export type RequestHandler = ExpressRequestHandler;
export type { RequestHandler as RequestHandlerType };

// This file should be included in your tsconfig.json under "include"
// Make sure it's being treated as a module
export {};
