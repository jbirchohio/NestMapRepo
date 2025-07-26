import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    cookies?: {
      [key: string]: string | undefined;
    };
    user?: {
      id: string;
      email: string;
      role: string;
      organizationId?: string | null;
    };
  }
}

export {};

