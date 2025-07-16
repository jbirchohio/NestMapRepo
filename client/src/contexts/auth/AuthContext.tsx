import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { JwtPayload } from '@/types/api';
import { getApiClient } from '@/services/api/apiClient';
import { SessionLockout } from '@/utils/sessionLockout';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Session } from 'next-auth';

// Constants for session management
// These are now handled by NextAuth before session expires

// Interfaces
interface DecodedJwt extends Omit<JwtPayload, 'organization_id'> {
  sub: string;
  email: string;
  name: string;
  role: string;
  organization_id: number;
  permissions: string[];
  exp: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  username?: string; // Add username property for compatibility
  role: string;
  organizationId: number;
  permissions: string[];
  displayName?: string;
}

// Context type
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

// Utility functions
function extractUserFromSession(session: Session | null): DecodedJwt | null {
  if (!session?.user) return null;
  try {
    // NextAuth session already contains decoded token data
    return {
      sub: session.user.id as string,
      email: session.user.email as string,
      name: session.user.name as string,
      role: (session.user as any).role || 'user',
      organization_id: (session.user as any).organizationId || 0,
      permissions: (session.user as any).permissions || [],
      exp: 0 // NextAuth handles token expiration
    };
  } catch (error) {
    console.error('Error extracting user from session:', error);
    return null;
  }
}

// NextAuth handles session expiration internally

// NextAuth handles role determination directly from the session

// Provider component
const AuthProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  
  // Initialize session lockout
  const sessionLockout = useMemo(() => SessionLockout.getInstance(), []);



  // State for user and auth status
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(status === 'loading');
  const [authReady, setAuthReady] = useState(status !== 'loading');
  const [error, setError] = useState<string | null>(null);

  // Sign out function
  const handleSignOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use NextAuth signOut
      await signOut({ redirect: false });
      
      // Clear user data
      setUser(null);
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear user data even if API call fails
      setUser(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Sign in function
  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if account is locked out
      if (sessionLockout.isLockedOut(email)) {
        const status = sessionLockout.getLockoutStatus(email);
        const minutesLeft = Math.ceil(status.remainingTime / 60000);
        throw new Error(`Account is locked. Try again in ${minutesLeft} minutes.`);
      }

      // Use NextAuth signIn
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });
      
      if (!result?.ok) {
        throw new Error(result?.error || 'Invalid credentials');
      }
      
      // Reset login attempts on successful login
      sessionLockout.unlockAccount(email);
      
      // Navigate to dashboard based on role
      // Role-based navigation will be handled in the useEffect that watches session changes
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      
      // Increment login attempts
      sessionLockout.recordFailedAttempt(email);
      
      // Check if account should be locked after this attempt
      if (sessionLockout.isLockedOut(email)) {
        const status = sessionLockout.getLockoutStatus(email);
        const minutesLeft = Math.ceil(status.remainingTime / 60000);
        setError(`Too many failed attempts. Account locked for ${minutesLeft} minutes.`);
      }
      
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [sessionLockout, toast]);

  // Sign in with provider (OAuth)
  const handleSignInWithProvider = useCallback(async (provider: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use NextAuth signIn with provider
      await signIn(provider, { redirect: false });
      
      // Navigation will be handled by the session change effect
    } catch (error) {
      console.error(`Sign in with ${provider} error:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to sign in with ${provider}`;
      setError(errorMessage);
      
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Initialize session lockout
        sessionLockout.initialize();
        
        // Initialize user data
        const decoded = extractUserFromSession(session);
        if (decoded) {
          setUser({
            id: parseInt(decoded.sub, 10),
            email: decoded.email,
            name: decoded.name || '',
            role: decoded.role,
            organizationId: decoded.organization_id,
            permissions: decoded.permissions || []
          });
          // Role type is now derived directly from user.role when needed
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setAuthReady(true);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [session, sessionLockout]);

  // Watch for session changes
  useEffect(() => {
    const handleSessionChange = async () => {
      try {
        // Initialize user data
        const decoded = extractUserFromSession(session);
        if (decoded) {
          setUser({
            id: parseInt(decoded.sub, 10),
            email: decoded.email,
            name: decoded.name || '',
            role: decoded.role,
            organizationId: decoded.organization_id,
            permissions: decoded.permissions || []
          });
          // Role type is now derived directly from user.role when needed
        } else {
          // Clear user data if session is invalid
          setUser(null);
        }
      } catch (error) {
        console.error('Error handling session change:', error);
      }
    };

    handleSessionChange();
  }, [session]);

  // Define missing functions
  const handleSignUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Register user through API
      await getApiClient().post('/auth/register', { email, password, username });
      
      // Sign in with the new credentials
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });
      
      if (!result?.ok) {
        throw new Error(result?.error || 'Registration successful but sign-in failed');
      }
      
      // Navigate to onboarding
      router.push('/onboarding');
      
      toast({
        title: 'Account created',
        description: 'Your account has been created successfully!',
        variant: 'default'
      });
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      setError(errorMessage);
      
      toast({
        title: 'Registration Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  // Refresh session
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // NextAuth handles session refreshing automatically
    return !!session;
  }, [session]);

  // Get login attempts for an email
  const getLoginAttemptsCount = useCallback((email: string): number => {
    const status = sessionLockout.getLockoutStatus(email);
    return status.attempts;
  }, [sessionLockout]);

  // Increment login attempts for an email
  const incrementLoginAttemptsCount = useCallback((email: string): void => {
    sessionLockout.recordFailedAttempt(email);
  }, [sessionLockout]);

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    authReady,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithProvider: handleSignInWithProvider,
    refreshToken,
    getLoginAttempts: getLoginAttemptsCount,
    incrementLoginAttempts: incrementLoginAttemptsCount,
    setAccountLockout: (email: string) => {
      sessionLockout.recordFailedAttempt(email);
      sessionLockout.clearAllLockouts();
      sessionLockout.recordFailedAttempt(email);
    },
    isAuthenticated: () => !!user,
    hasPermission: (permission: string) => user?.permissions?.includes(permission) ?? false,
    isLoading: loading,
    validatePassword: () => ({ isValid: true })
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
