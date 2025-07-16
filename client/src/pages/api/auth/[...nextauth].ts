import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { jwtDecode } from 'jwt-decode';
import { AxiosResponse } from 'axios';
import axios from 'axios';
import config from '@/config/env';

// Define types for API responses
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  organization_id: number;
  iat: number;
  exp: number;
}

// Type guard for AuthResponse
function isAuthResponse(data: unknown): data is AuthResponse {
  return (
    typeof data === 'object' && 
    data !== null &&
    'access_token' in data &&
    'refresh_token' in data
  );
}

// Type guard for AxiosResponse with AuthResponse
function isAuthResponseResponse(response: unknown): response is AxiosResponse<AuthResponse> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    isAuthResponse((response as AxiosResponse).data)
  );
}

// Extend the default session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: number;
      accessToken: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: number;
    accessToken: string;
    refreshToken: string;
  }
}

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

// Create a separate API client for auth to avoid circular dependencies
const authApiClient = axios.create({
  baseURL: config.API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }

          // Use a separate API client to avoid circular dependencies
          const response = await authApiClient.post<AuthResponse>('/auth/login', {
            email: credentials.email,
            password: credentials.password
          });

          if (isAuthResponseResponse(response) && response.data.access_token) {
            const decoded = jwtDecode<JwtPayload>(response.data.access_token);
            
            return {
              id: decoded.sub,
              email: decoded.email,
              name: decoded.name,
              role: decoded.role,
              organizationId: decoded.organization_id,
              accessToken: response.data.access_token,
              refreshToken: response.data.refresh_token
            };
          }
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          ...user,
          accessTokenExpires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
      }

      // Return previous token if the access token has not expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role,
          organizationId: token.organizationId,
          accessToken: token.accessToken
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',  // Updated to match your actual login page
    error: '/login',   // Redirect errors to login page
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'your-fallback-secret-for-development-only',
});

async function refreshAccessToken(token: any) {
  try {
    // Use a separate API client to avoid circular dependencies
    const response = await authApiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken: token.refreshToken
    });

    if (!isAuthResponseResponse(response)) {
      throw new Error('Invalid refresh token response');
    }

    const decoded = jwtDecode<JwtPayload>(response.data.access_token);

    return {
      ...token,
      accessToken: response.data.access_token,
      accessTokenExpires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      refreshToken: response.data.refresh_token || token.refreshToken,
      role: decoded.role || token.role,
      organizationId: decoded.organization_id || token.organizationId
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
