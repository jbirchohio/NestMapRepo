import { JwtUser } from '../auth/types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      organization?: {
        id: string;
        name: string;
        settings: any;
      };
    }
  }
}

export {};