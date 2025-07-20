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
    
    // In Vite environment, NextAuth might not work properly
    // Provide explicit fallback for unauthenticated state
    const isActuallyAuthenticated = status === 'authenticated' && !!session?.user;
    
    const state: AuthState = {
      user: isActuallyAuthenticated ? (session.user as User) : null,
      isAuthenticated: isActuallyAuthenticated,
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
    console.warn('NextAuth not properly initialized in Vite environment:', error);
    // Provide a fallback state if NextAuth fails to initialize
    // This is common in Vite/React Router environments
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null, // Don't show error for expected NextAuth/Vite incompatibility
      signIn: async (_email: string, _password: string, _options: { callbackUrl?: string } = {}) => {
        // Fallback: redirect to login page or show auth modal
        console.log('Auth system not available, redirecting to login');
        window.location.href = '/login';
        return '/login';
      },
      signInWithProvider: async () => { 
        console.log('Provider auth not available');
        throw new Error('Provider authentication not available'); 
      },
      signOut: async () => { 
        console.log('Sign out not available');
        window.location.href = '/';
      },
      continueAsGuest: async () => { 
        console.log('Guest mode not available');
        throw new Error('Guest mode not available'); 
      },
      hasRole: () => false,
      hasAnyRole: () => false,
      getAccessToken: () => null,
    };
  }
}

export default useAuth;
