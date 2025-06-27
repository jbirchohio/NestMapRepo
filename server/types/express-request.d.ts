import type { AuthUser } from '@shared/src/types/auth/user.js';

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
      auth?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
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
      body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
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
