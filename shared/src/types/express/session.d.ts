import type { Session, SessionData as ExpressSessionData } from 'express-session';

declare module 'express-session' {
  interface SessionData extends ExpressSessionData {
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

export {};
