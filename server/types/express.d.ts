import { JWTUser } from '../controllers/authController';

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
      organization?: {
        id: string;
        name: string;
        settings: any;
      };
    }
  }
}

export {};