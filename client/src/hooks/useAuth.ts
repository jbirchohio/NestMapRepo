import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import config from '@/config/env';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: number;
  accessToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  // Use a try-catch block to handle potential NextAuth errors in Vite environment
  try {
    const { data: session, status } = useSession();
    
    const state: AuthState = {
      user: session?.user as User || null,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      error: null, // NextAuth handles errors through callbacks
    };


  const signIn = async (email: string, password: string, options: { callbackUrl?: string } = {}) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: options.callbackUrl || '/dashboard',
      });

      if (result?.error) {
        // Map common error messages to user-friendly ones
        const errorMessage = result.error === 'CredentialsSignin' 
          ? 'Invalid email or password' 
          : result.error;
        throw new Error(errorMessage);
      }

      // If we have a URL, let the component handle the redirect
      // This allows for better loading states and error handling in the UI
      return result?.url || '/dashboard';
    } catch (error) {
      console.error('Sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new Error(errorMessage);
    }
  };

  const signInWithProvider = async (
    provider: 'google' | 'github' | 'microsoft',
    options: { callbackUrl?: string } = {}
  ) => {
    try {
      await nextAuthSignIn(provider, {
        callbackUrl: options.callbackUrl || '/dashboard',
        redirect: true,
      });
    } catch (error) {
      console.error(`Sign in with ${provider} failed:`, error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to sign in with ${provider}`;
      throw new Error(errorMessage);
    }
  };

  const signOut = async (options: { callbackUrl?: string } = {}) => {
    try {
      await nextAuthSignOut({ 
        callbackUrl: options.callbackUrl || '/login',
        redirect: true,
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  };

  const hasRole = (requiredRole: string): boolean => {
    if (!state.user) return false;
    return state.user.role === requiredRole;
  };

  const hasAnyRole = (requiredRoles: string[]): boolean => {
    if (!state.user) return false;
    return requiredRoles.includes(state.user.role);
  };

  const getAccessToken = (): string | null => {
    return state.user?.accessToken || null;
  };

  const continueAsGuest = async () => {
    try {
      // Call the guest login endpoint
      const response = await fetch(`${config.API_BASE_URL}/auth/guest-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to continue as guest');
      }

      const data = await response.json();
      
      // Use the guest credentials to sign in
      return await signIn(data.email, data.password, { callbackUrl: '/app' });
    } catch (error) {
      console.error('Guest login error:', error);
      throw error;
    }
  };

  return {
    ...state,
    signIn,
    signInWithProvider,
    signOut,
    hasRole,
    hasAnyRole,
    getAccessToken,
    continueAsGuest,
  };
} catch (error) {
  console.error('Error in useAuth hook:', error);
  // Provide a fallback state if NextAuth fails to initialize
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: 'Authentication system failed to initialize',
    signIn: async () => { throw new Error('Auth system not available'); },
    signInWithProvider: async () => { throw new Error('Auth system not available'); },
    signOut: async () => { throw new Error('Auth system not available'); },
    demoLogin: async () => { throw new Error('Auth system not available'); },
    continueAsGuest: async () => { throw new Error('Auth system not available'); },
    hasRole: () => false,
    hasAnyRole: () => false,
    getAccessToken: () => null,
  };
}
}

export default useAuth;
