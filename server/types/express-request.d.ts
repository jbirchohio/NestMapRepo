import type { AuthUser } from '@shared/schema/types/auth/user.js';
import type { JwtPayload } from '@shared/schema/types/auth/jwt.js';

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
      auth?: JwtPayload;
      organizationId?: string;
      requestId?: string;
      startTime?: [number, number];
      token?: string;
      cookies: {
        [key: string]: string | undefined;
      };
      params: {
        [key: string]: string;
      };
      body: unknown;
      query: {
        [key: string]: string | string[] | undefined;
      };
      isAuthenticated?: () => boolean;
      hasRole?: (role: string | string[]) => boolean;
      hasPermission?: (permissions: string | string[]) => boolean;
    }
  }
}

export {};
