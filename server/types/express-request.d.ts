import { AuthUser } from '../src/types/auth-user';

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
      auth?: any;
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
      body: any;
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
