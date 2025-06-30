import { Request } from 'express';
import { AuthUser } from '../../types/auth-user';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
