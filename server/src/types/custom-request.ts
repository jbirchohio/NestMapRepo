import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

