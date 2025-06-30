import 'express-serve-static-core';
import { UserRole } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    cookies?: {
      [key: string]: string | undefined;
    };
    user?: {
      id: string;
      email: string;
      role: UserRole;
      organizationId: string | null;
      permissions?: string[];
    };
    organizationId?: string | null;
  }
}

export {};
