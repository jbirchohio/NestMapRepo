import 'express-serve-static-core.js';

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
      cookies: {
        [key: string]: string | undefined;
      };
      params: {
        [key: string]: string;
      };
      body: any;
    }
  }
}
