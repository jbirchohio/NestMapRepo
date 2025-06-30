import 'express';
import type { AuthUser } from './user.js';

declare global {
  namespace Express {
    interface User extends AuthUser {}
    
    interface Request {
      user?: User;
      organizationId?: string | null;
    }
  }
}
