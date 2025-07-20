import { useState, useEffect } from 'react';
import { jwtAuth, type User as JWTUser } from '@/lib/jwtAuth';
import config from '@/config/env';

// Map JWT User to our expected User interface
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
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Initialize auth state from JWT
    const initializeAuth = () => {
      const jwtUser = jwtAuth.getUser();
      const token = jwtAuth.getToken();
      
      if (jwtUser && token) {
        // Map JWT user to our User interface
        const user: User = {
          id: jwtUser.id.toString(),
          email: jwtUser.email,
          name: jwtUser.username,
          role: jwtUser.role,
          organizationId: jwtUser.organization_id,
          accessToken: token,
        };
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    // Initialize immediately
    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = jwtAuth.onAuthStateChange((jwtUser) => {
      if (jwtUser) {
        const token = jwtAuth.getToken();
        const user: User = {
          id: jwtUser.id.toString(),
          email: jwtUser.email,
          name: jwtUser.username,
          role: jwtUser.role,
          organizationId: jwtUser.organization_id,
          accessToken: token || '',
        };
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, options: { callbackUrl?: string } = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await jwtAuth.signIn(email, password);
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error?.message || 'Login failed' 
        }));
        throw result.error;
      }

      // Success is handled by the auth state change listener
      return options.callbackUrl || '/dashboard';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, username: string, options: { callbackUrl?: string } = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await jwtAuth.signUp(email, password, username);
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error?.message || 'Registration failed' 
        }));
        throw result.error;
      }

      // Success is handled by the auth state change listener
      return options.callbackUrl || '/dashboard';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  };

  const signInWithProvider = async (
    provider: 'google' | 'github' | 'microsoft',
    options: { callbackUrl?: string } = {}
  ) => {
    // For now, provider auth is not implemented with JWT
    throw new Error(`${provider} authentication not yet implemented`);
  };

  const signOut = async (options: { callbackUrl?: string } = {}) => {
    try {
      jwtAuth.signOut();
      // Auth state change will be handled by the listener
      if (options.callbackUrl) {
        window.location.href = options.callbackUrl;
      }
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
    return jwtAuth.getToken();
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
    signUp,
    signInWithProvider,
    signOut,
    hasRole,
    hasAnyRole,
    getAccessToken,
    continueAsGuest,
  };
}

export default useAuth;
