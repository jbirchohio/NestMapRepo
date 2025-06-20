import { Session, SessionData } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    user_id: string;
    organization_id: string;
    // Add other session properties as needed
  }
}

declare global {
  namespace Express {
    interface Request {
      session: Session & Partial<SessionData>;
    }
  }
}
