import { User } from '@shared/users/entities/user.entity';
import { ParamsDictionary, Query } from 'express-serve-static-core.js';

declare global {
  namespace Express {
    interface Request<ReqBody = any, ResBody = any, ReqQuery = Query> {
      user?: User;
      isAuthenticated?: () => boolean;
      isUnauthenticated?: () => boolean;
      organizationFilter?: any;
      responseMetrics?: any;
      ip?: string;
      socket: {
        remoteAddress?: string;
      };
      cookies: {
        [key: string]: string;
      };
      headers: {
        [key: string]: string | string[] | undefined;
        'user-agent'?: string;
        'authorization'?: string;
      };
      body: ReqBody;
      params: ParamsDictionary;
      query: ReqQuery;
      [key: string]: any;
    }
  }
}

// Export the augmented Request type
export interface Request<ReqBody = any, ResBody = any, ReqQuery = Query> extends Express.Request<ParamsDictionary, ResBody, ReqBody, ReqQuery> {
  body: ReqBody;
  params: ParamsDictionary;
  query: ReqQuery;
  cookies: { [key: string]: string };
  socket: { remoteAddress?: string };
  ip?: string;
  headers: {
    [key: string]: string | string[] | undefined;
    'user-agent'?: string;
    'authorization'?: string;
  };
}

export {};
