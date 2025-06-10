import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api/apiClient';
import { User, JwtPayload, AuthTokens } from '@/types/jwt';
import { SecureCookie } from '@/utils/SecureCookie';
import { SessionLockout } from '@/utils/sessionLockout';
import { validatePassword, checkPasswordHistory, addPasswordToHistory } from '@/utils/passwordValidator';
import { TokenManager } from '@/utils/tokenManager';
import { SessionSecurity } from '@/utils/sessionSecurity';
import { decode as jwtDecode } from 'jwt-decode';
import { handleError, TokenError, CSRFError, SessionError, AccountLockoutError, ValidationError } from '@/utils/errorHandler';

// Type for the decoded JWT payload
interface DecodedJwt extends JwtPayload {
  exp: number;
  iat: number;
}

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Utility function to decode JWT
const decodeJWT = (token: string): DecodedJwt => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    throw new Error('Invalid token');
  }
};

// Utility function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  const now = Date.now() / 1000;
  return decoded.exp < now;
};

// Auth response type
interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  error: string | null;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  validatePassword: (password: string) => PasswordValidationResult;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tokenManager = TokenManager.getInstance();
  const sessionSecurity = SessionSecurity.getInstance();
  const sessionLockout = SessionLockout.getInstance();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Initialize auth state and token rotation
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = SecureCookie.getAccessToken();
        if (token && !isTokenExpired(token)) {
          const decoded = decodeJWT(token);
          setUser({
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            permissions: decoded.permissions,
            roles: decoded.permissions,
            createdAt: decoded.createdAt,
            updatedAt: decoded.updatedAt
          });

          // Initialize token manager
          const manager = new TokenManager(navigate, toast);
          manager.startRotation({
            onTokenRefresh: () => {
              console.log('Tokens successfully refreshed');
            },
            onError: (error) => {
              setError(error.message);
            }
          });
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    };

    initializeAuth();

    // Cleanup on unmount
    return () => {
      tokenManager.stopRotation();
    };
  }, [navigate, toast]);

  // Handle session timeout
  useEffect(() => {
    const handleIdle = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;
      
      if (idleTime > SESSION_TIMEOUT) {
        signOut();
        toast.toast({
          title: 'Session Expired',
          description: 'Your session has expired due to inactivity. Please sign in again.',
          variant: 'destructive'
        });
      } else if (idleTime > SESSION_TIMEOUT - 5 * 60 * 1000) {
        toast.toast({
          title: 'Session Warning',
          description: 'Your session will expire soon. Please continue using the app to stay active.',
          variant: 'warning'
        });
      }
    };

    const interval = setInterval(() => {
      setLastActivity(Date.now());
    }, 1000);

    const timeout = setTimeout(handleIdle, SESSION_TIMEOUT - 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [lastActivity, signOut, toast]);

  // Authentication methods
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Get user IP
      const ip = sessionSecurity.getIp();
      
      // Check if account is locked
      if (sessionLockout.isLockedOut(email)) {
        throw new AccountLockoutError('Account is locked due to too many failed attempts');
      }

      // Record attempt
      sessionLockout.recordFailedAttempt(ip, email);

      // Check lockout status
      const status = sessionLockout.getLockoutStatus(email);
      if (status.attempts >= 5) {
        throw new AccountLockoutError('Account is locked due to too many failed attempts');
      }

      // Increment login attempts
      incrementLoginAttempts(email);

      // Validate password strength
      if (!validatePassword(password)) {
        throw new ValidationError('Password does not meet requirements');
      }

      // Attempt login with security context
      const securityContext: SecurityContext = {
        userId: getLoginAttempts(email).toString(),
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sensitiveData: false
      };

      try {
        const response = await api.post<AuthResponse>('/auth/signin', 
          { email, password },
          {
            skipAuth: false
          }
        );
        
        // Save tokens with security context
        SecureCookie.setAccessToken(response.data.tokens.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 3600, // 1 hour
          ...securityContext
        });
        
        SecureCookie.set('refresh_token', response.data.tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 86400, // 24 hours
          ...securityContext
        });

        // Update user state
        setUser({
          ...response.data.user,
          permissions: response.data.user.roles || [],
          createdAt: response.data.user.createdAt || new Date().toISOString(),
          updatedAt: response.data.user.updatedAt || new Date().toISOString()
        });
        setError(null);
        
        // Clear lockout on successful login
        sessionLockout.unlockAccount(email);
        
        // Start token rotation
        const manager = new TokenManager(navigate, toast);
        manager.startRotation({
          onTokenRefresh: () => {
            console.log('Tokens successfully refreshed');
          },
          onError: (error: Error) => {
            handleError(error);
          }
        });
        
        // Rotate session on successful login
        SessionSecurity.getSessionSecurity().rotateSession();
        
        // Navigate to home
        navigate('/');
        
        // Show success toast
        toast.toast({
          title: 'Success',
          description: 'Successfully signed in.',
          variant: 'success'
        });
      } catch (err) {
        // Handle API errors
        if (err instanceof Error) {
          // Handle lockout
          if (getLoginAttempts(email) >= MAX_LOGIN_ATTEMPTS) {
            setAccountLockout(email);
            throw new AccountLockoutError('Too many failed attempts. Account locked.');
          }

          // Handle CSRF errors
          if (err.message.includes('CSRF')) {
            throw new CSRFError('CSRF token validation failed. Please try again.');
          }

          // Handle token errors
          if (err.message.includes('token')) {
            throw new TokenError('Token validation failed. Please sign in again.');
          }

          // Handle session errors
          if (err.message.includes('session')) {
            throw new SessionError('Session validation failed. Please sign in again.');
          }

          // Log security context with error
          console.error('Authentication error with context:', {
            error: err.message,
            context: securityContext
          });
        }

        // Handle other errors
        handleError(err as Error);
        throw err;
      }
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  }, [navigate, toast]);

  // Other auth methods...

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    authReady,
    error,
    isAuthenticated: () => !!user,
    hasPermission: (permission: string) => user?.permissions?.includes(permission) ?? false,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
