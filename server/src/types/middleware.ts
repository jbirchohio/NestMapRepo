import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from 'express';
import type { UserProfile } from '@shared/schema/types/auth/user';

// Define our custom request properties
interface CustomRequestProps {
  user?: UserProfile;
  apiVersion?: string;
  apiKeyAuth?: {
    organizationId: string;
    permissions: string[];
    rateLimit: number;
  };
  organizationId?: string | null;
  organizationFilter?: (orgId: string | null) => boolean;
}

// Extend the Express Request type with our custom properties
declare global {
  namespace Express {
    interface Request extends CustomRequestProps {}
  }
}

// Create a type that combines Express Request with our custom properties
export type SecureRequest = ExpressRequest & CustomRequestProps;

export type SecureRequestHandler = RequestHandler & {
  (req: SecureRequest, res: Response, next: NextFunction): void | Promise<void>;
};

export type Middleware = RequestHandler;
