import type { Request, ParamsDictionary, Query } from '../../express-augmentations';

// Define the user type that will be attached to the request
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  [key: string]: any;
}

// Extend the Express Request type to include our user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Type for authenticated request handlers
export type AuthenticatedRequest = Request<ParamsDictionary, any, any, Query> & { 
  user: AuthUser;
  params: ParamsDictionary & { id?: string };
};
