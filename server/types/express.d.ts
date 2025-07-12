import { AuthUser } from '../src/types/auth-user';
import { UserRole } from '../types/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organization?: {
        id: string;
        name: string;
        settings: any;
      };
      token?: string;
      requestId?: string;
      startTime?: [number, number];
      isAuthenticated(): boolean;
      hasRole(role: string | string[]): boolean;
      hasPermission(permission: string | string[]): boolean;
    }
    
    interface Response {
      success<T = any>(data?: T, message?: string, statusCode?: number): void;
      error(message: string, statusCode?: number, errorCode?: string): void;
      paginate<T = any>(data: T[], total: number, page: number, limit: number): void;
    }
  }
}

export {};