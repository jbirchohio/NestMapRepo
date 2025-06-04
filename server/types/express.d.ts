import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        organizationId?: number;
        organization_id?: number; // Keep for backward compatibility
        userId?: string;
        user_id?: string; // Keep for backward compatibility
        permissions?: string[];
      };
      organization?: {
        id: number;
        name: string;
        settings: any;
      };
    }
  }
}

export {};