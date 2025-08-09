import { JWTUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
      apiVersion?: string;
      authSession?: {
        userId: number;
        sessionId: string;
        mfaVerified?: boolean;
        role?: string;
      };
      authIdentifier?: string;
      file?: any;
      isAuthenticated?: () => boolean;
      skipCaseConversion?: boolean;
    }
  }
}

export {};