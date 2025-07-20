import { createContext, useContext } from 'react';
import { useAuth as useJWTAuth } from '@/hooks/useAuth';

// Interface for compatibility with existing code
interface User {
  id: number;
  email: string;
  name: string;
  username?: string;
  role: string;
  organizationId: number;
  permissions: string[];
  displayName?: string;
}

// Context type - simplified to match JWT auth
interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getLoginAttempts: (email: string) => number;
  incrementLoginAttempts: (email: string) => void;
  setAccountLockout: (email: string) => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
  validatePassword: () => { isValid: boolean };
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps JWT auth
const AuthProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const jwtAuth = useJWTAuth();

  // Transform JWT auth user to match expected interface
  const transformedUser: User | null = jwtAuth.user ? {
    id: parseInt(jwtAuth.user.id),
    email: jwtAuth.user.email,
    name: jwtAuth.user.name,
    username: jwtAuth.user.name, // Use name as username for compatibility
    role: jwtAuth.user.role,
    organizationId: jwtAuth.user.organizationId,
    permissions: [], // JWT auth doesn't have permissions array
    displayName: jwtAuth.user.name,
  } : null;

  // Wrapper functions to match expected interface
  const handleSignIn = async (email: string, password: string) => {
    try {
      await jwtAuth.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    try {
      await jwtAuth.signUp(email, password, username);
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await jwtAuth.signOut();
    } catch (error) {
      throw error;
    }
  };

  const handleSignInWithProvider = async (provider: string) => {
    try {
      await jwtAuth.signInWithProvider(provider as 'google' | 'github' | 'microsoft');
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    // JWT auth doesn't have explicit refresh, but token is managed automatically
    return jwtAuth.isAuthenticated;
  };

  // Mock functions for compatibility (not implemented in JWT auth)
  const getLoginAttempts = (email: string): number => 0;
  const incrementLoginAttempts = (email: string): void => {};
  const setAccountLockout = (email: string): void => {};
  const validatePassword = () => ({ isValid: true });

  // Context value
  const value: AuthContextType = {
    user: transformedUser,
    loading: jwtAuth.isLoading,
    authReady: !jwtAuth.isLoading,
    error: jwtAuth.error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithProvider: handleSignInWithProvider,
    refreshToken,
    getLoginAttempts,
    incrementLoginAttempts,
    setAccountLockout,
    isAuthenticated: () => jwtAuth.isAuthenticated,
    hasPermission: (permission: string) => false, // Not implemented in JWT auth
    isLoading: jwtAuth.isLoading,
    validatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };
