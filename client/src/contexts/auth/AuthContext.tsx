import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import type { JwtPayload, AuthTokens } from '@/types/api';
import { TokenManager } from '@/utils/tokenManager';
import { apiClient } from '@/services/api/apiClient';
import { SessionLockout } from '@/utils/sessionLockout';
import { jwtDecode } from 'jwt-decode';

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before session expires

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
  roleType: 'corporate' | 'agency' | null;
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
function decodeToken(token: string | null): DecodedJwt | null {
  if (!token) return null;
  try {
    return jwtDecode<DecodedJwt>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

function isTokenExpired(token: string | null): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  const now = Date.now() / 1000;
  return decoded.exp < now;
}

// Helper function to determine role type from user role
function getRoleType(userRole: string | null): 'corporate' | 'agency' | null {
  if (!userRole) return null;
  
  // Map user roles to role types
  const roleMapping: Record<string, 'corporate' | 'agency'> = {
    'admin': 'corporate',
    'user': 'corporate',
    'corporate': 'corporate',
    'agency': 'agency',
    'travel_agent': 'agency',
    'agent': 'agency',
  };
  
  return roleMapping[userRole.toLowerCase()] || 'corporate';
}

// Provider component
const AuthProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tokenManager = TokenManager.getInstance(navigate);
  const sessionLockout = SessionLockout.getInstance();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Auth signOut function that can be used throughout the component
  const signOut = useCallback(async () => {
    try {
      await apiClient.post<void>('/auth/logout');
      tokenManager.clearTokens();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear tokens and redirect even if API call fails
      tokenManager.clearTokens();
      setUser(null);
      navigate('/login');
    }
  }, [tokenManager, navigate, setUser]);

  // Initialize auth state
  useEffect(() => {
    // Token refresh function - used within this effect and actually called
    const refreshAuthToken = async () => {
      try {
        const accessToken = tokenManager.getAccessToken();
        const refreshToken = tokenManager.getRefreshToken();
        
        if (accessToken && refreshToken) {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
          });

          if (response.ok) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await response.json();
            tokenManager.setTokens(newAccessToken, newRefreshToken);
            
            const decoded = decodeToken(newAccessToken);
            if (decoded) {
              const user: User = {
                id: parseInt(decoded.sub, 10),
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
                organizationId: decoded.organization_id,
                permissions: decoded.permissions || [],
                displayName: decoded.name
              };
              setUser(user);
            }
          } else {
            throw new Error('Failed to refresh token');
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Call the signOut function defined at component level
        await signOut();
      }
    };

    const initializeAuth = async () => {
      try {
        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          const decoded = decodeToken(accessToken);
          if (decoded && !isTokenExpired(accessToken)) {
            const user: User = {
              id: parseInt(decoded.sub, 10),
              email: decoded.email || '',
              name: decoded.name || '',
              role: decoded.role || 'user',
              organizationId: decoded.organization_id || 0,
              permissions: decoded.permissions || [],
              displayName: decoded.name || ''
            };
            setUser(user);
          } else {
            // Token is expired, try to refresh it
            await refreshAuthToken();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    };

    initializeAuth();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tokenManager.clearTokens();
    };
  }, [tokenManager]);

  // Handle session timeout
  useEffect(() => {
    const handleIdle = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;
      
      if (idleTime > SESSION_TIMEOUT) {
        const signOut = async () => {
          tokenManager.clearTokens();
          setUser(null);
          navigate('/login');
        };
        signOut();
        toast({
          title: 'Session Expiring Soon',
          description: 'Your session will expire in 5 minutes',
          variant: 'default'
        });
      } else if (idleTime > SESSION_TIMEOUT - SESSION_WARNING_THRESHOLD) {
        toast({
          title: 'Session Warning',
          description: 'Your session will expire soon. Please continue using the app to stay active.',
          variant: 'default'
        });
      }
    };

    const interval = setInterval(() => {
      setLastActivity(Date.now());
    }, 1000);

    const timeout = setTimeout(handleIdle, SESSION_TIMEOUT - SESSION_WARNING_THRESHOLD);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [lastActivity, signOut, toast]);

  // Helper methods
  const handleError = useCallback((error: Error) => {
    console.error('Auth error:', error);
    setError(error.message);
    toast({
      title: 'Authentication Error',
      description: error.message,
      variant: 'destructive'
    });
  }, [toast, setError]);

  const incrementLoginAttempts = useCallback((email: string): void => {
    sessionLockout.recordFailedAttempt(window.location.hostname, email);
  }, [sessionLockout]);

  const getLoginAttempts = useCallback((email: string): number => {
    const status = sessionLockout.getLockoutStatus(email);
    return status.attempts;
  }, [sessionLockout]);

  // Authentication methods are now defined above

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiClient.post<AuthTokens & { user: User }>('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response;
      tokenManager.setTokens(accessToken, refreshToken);
      setUser(user);
      incrementLoginAttempts(email);
    } catch (error) {
      handleError(error as Error);
      incrementLoginAttempts(email);
    }
  }, [tokenManager, setUser, incrementLoginAttempts, handleError]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const response = await apiClient.post<AuthTokens & { user: User }>('/auth/signup', { email, password, username });
      const { accessToken, refreshToken, user } = response;
      tokenManager.setTokens(accessToken, refreshToken);
      setUser(user);
    } catch (error) {
      handleError(error as Error);
    }
  }, [tokenManager, setUser, handleError]);



  const signInWithProvider = useCallback(async (provider: string) => {
    try {
      const response = await apiClient.post<AuthTokens & { user: User }>(`/auth/${provider}`);
      const { accessToken, refreshToken, user } = response;
      tokenManager.setTokens(accessToken, refreshToken);
      setUser(user);
    } catch (error) {
      handleError(error as Error);
    }
  }, [tokenManager, setUser, handleError]);

  const refreshToken = useCallback(async () => {
    try {
      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) {
        return false;
      }
      
      const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken: tokenManager.getRefreshToken()
      });

      const { accessToken: newAccessToken } = response;
      tokenManager.setTokens(newAccessToken, tokenManager.getRefreshToken()!);
      return true;
    } catch (error) {
      handleError(error as Error);
      return false;
    }
  }, [tokenManager, handleError]);

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    authReady,
    error,
    roleType: getRoleType(user?.role || null),
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshToken,
    getLoginAttempts,
    incrementLoginAttempts,
    setAccountLockout: (email: string) => {
      sessionLockout.recordFailedAttempt(window.location.hostname, email);
      sessionLockout.clearAllLockouts();
      sessionLockout.recordFailedAttempt(window.location.hostname, email);
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
