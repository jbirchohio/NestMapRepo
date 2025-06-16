import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api/apiClient';
import { User, JwtPayload, AuthTokens, ApiResponse } from '@/types/api';
import { TokenManager } from '@/utils/tokenManager';
import { SessionLockout } from '@/utils/sessionLockout';
import jwtDecode from 'jwt-decode';

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before session expires

// Interfaces
interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

interface SecurityContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sensitiveData: boolean;
}

interface DecodedJwt {
  sub: string;
  email: string;
  name: string;
  role: string;
  organization_id: string;
  permissions: string[];
  exp: number;
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
const decodeToken = useCallback((token: string | null): DecodedJwt | null => {
  if (!token) return null;
  try {
    return jwtDecode(token) as DecodedJwt;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}, []);

const isTokenExpired = useCallback((token: string | null): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  const now = Date.now() / 1000;
  return decoded.exp < now;
}, [decodeToken]);

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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          const decoded = decodeToken(accessToken);
          if (!isTokenExpired(accessToken)) {
            setUser({
              id: parseInt(decoded.sub),
              email: decoded.email,
              username: decoded.name,
              role: decoded.role,
              organization_id: decoded.organization_id || null,
              permissions: decoded.permissions || []
            });
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
    const cleanup = () => {
      tokenManager.stopTokenRotation();
    };
    return cleanup;
  }, [tokenManager]);

  // Handle session timeout
  useEffect(() => {
    const handleIdle = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;
      
      if (idleTime > SESSION_TIMEOUT) {
        signOut();
        toast({
          title: 'Session Expired',
          description: 'Your session has expired due to inactivity. Please sign in again.',
          variant: 'destructive'
        });
      } else if (idleTime > SESSION_TIMEOUT - SESSION_WARNING_THRESHOLD) {
        toast({
          title: 'Session Warning',
          description: 'Your session will expire soon. Please continue using the app to stay active.',
          variant: 'warning'
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
  }, [lastActivity, signOut, toast, SESSION_TIMEOUT, SESSION_WARNING_THRESHOLD]);

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

  // Authentication methods
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<ApiResponse<AuthTokens & { user: User }>>('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
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
      const response = await api.post<ApiResponse<AuthTokens & { user: User }>>('/auth/signup', { email, password, username });
      const { accessToken, refreshToken, user } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      setUser(user);
    } catch (error) {
      handleError(error as Error);
    }
  }, [tokenManager, setUser, handleError]);

  const signOut = useCallback(async () => {
    try {
      await api.post<ApiResponse<void>>('/auth/logout');
      tokenManager.destroy();
      setUser(null);
      navigate('/login');
    } catch (error) {
      handleError(error as Error);
    }
  }, [tokenManager, navigate, setUser, handleError]);

  const signInWithProvider = useCallback(async (provider: string) => {
    try {
      const response = await api.post<ApiResponse<AuthTokens & { user: User }>>(`/auth/${provider}`);
      const data = response.data;
      const { accessToken, refreshToken, user } = data.data;
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
      
      const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
        refreshToken: tokenManager.getRefreshToken()
      });
      
      const { accessToken: newAccessToken } = response.data;
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