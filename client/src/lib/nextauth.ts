import 'next-auth/jwt';
import { DefaultSession } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: number;
      accessToken: string;
    } & DefaultSession['user'];
  }
}

// Extend the built-in JWT types
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: number;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }
}

// Note: The actual NextAuth configuration is in pages/api/auth/[...nextauth].ts
// This file only contains type definitions that can be imported throughout the app.
