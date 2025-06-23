import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { authService } from '@/services/authService';
import { TokenManager } from '@/utils/tokenManager';
import { SessionLockout } from '@/utils/sessionLockout';
import type {
  UserResponse,
  LoginDto,
  RegisterDto,
  AuthError,
  Permission
} from '@shared/types/auth/dto';
import type { JwtPayload } from '@shared/types/auth';

// Use the shared JwtPayload type which already includes standard claims
// and extend it with any custom claims if needed
type ExtendedJwtPayload = JwtPayload & {
  permissions?: string[];
  tenantId?: string;
};

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before session expires
const TOKEN_REFRESH_MARGIN = 60 * 1000; // 1 minute before token expires

// Context type
export interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  authReady: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string, tenantId: string) => Promise<void>;
  signUp: (data: RegisterDto) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission | string) => boolean;
  isLoading: boolean;
  sessionExpiresAt: Date | null;
}

// Create context with proper type
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tokenManager = useMemo(() => TokenManager.getInstance(), []);
  const sessionLockout = useMemo(() => SessionSecurity.getInstance(), []);

  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => {
    return !!user && !!tokenManager.getAccessToken();
  }, [user, tokenManager]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: Permission | string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission as string);
  }, [user]);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((userData: UserResponse) => {
    setUser(userData);
    setError(null);
    
    // Set session expiration
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + SESSION_TIMEOUT);
    setSessionExpiresAt(expiresAt);
    
    // Reset session lockout on successful auth
    sessionLockout.reset();
  }, [sessionLockout]);

  // Handle authentication errors
  const handleAuthError = useCallback((error: unknown) => {
    console.error('Authentication error:', error);
    
    let errorMessage = 'An authentication error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    setError({
      message: errorMessage,
      code: 'AUTH_ERROR',
      status: 401
    });
    
    // Show error toast
    toast({
      title: 'Authentication Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }, [toast]);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const tokenManager = useMemo(() => new TokenManager(), []);
  const sessionLockout = useMemo(() => new SessionLockout(), []);

  // Check if user is authenticated
  const isAuthenticated = useCallback((): boolean => {
    const tokens = tokenManager.getTokens();
    if (!tokens?.accessToken) return false;
    
    try {
      const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
      return decoded.exp ? decoded.exp * 1000 > Date.now() : false;
    } catch (error) {
      return false;
    }
  }, [tokenManager]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: Permission | string): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    // Check direct permissions
    const permissionStr = typeof permission === 'string' ? permission : `${permission.resource}:${permission.action}`;
    return user.permissions?.includes(permissionStr) || false;
  }, [user]);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((tokens: AuthTokens, userData: User) => {
    tokenManager.setTokens(tokens);
    setUser(userData);
    
    // Set session expiration
    if (tokens.expires_in) {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      setSessionExpiresAt(expiresAt);
    }
    
    setError(null);
    setAuthReady(true);
    setLoading(false);
  }, [tokenManager]);

  // Handle authentication errors
  const handleAuthError = useCallback((error: any) => {
    let authError: AuthError;
    
    if (error instanceof AuthError) {
      authError = error;
    } else {
      authError = new AuthError(
        AuthErrorCode.AUTHENTICATION_FAILED,
        error?.message || 'Authentication failed'
      );
    }
    
    setError(authError);
    setLoading(false);
    
    // Show error toast
    toast({
      title: 'Authentication Error',
      description: authError.message,
      variant: 'destructive',
    });

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string, tenantId: string) => {
    try {
      setLoading(true);
      
      // Check session lockout
      if (sessionLockout.isLockedOut()) {
        const timeLeft = sessionLockout.getTimeUntilUnlock();
        throw new Error(`Too many attempts. Please try again in ${Math.ceil(timeLeft / 1000)} seconds.`);
      }
      
      const user = await authService.login({ email, password, tenantId });
      
      // Handle successful auth
      handleAuthSuccess(user);
      
      // Redirect to dashboard or intended URL
      navigate('/dashboard');
      
      // Show success message
      toast({
        title: 'Login successful',
        description: `Welcome back, ${user.firstName || 'User'}!`,
      });
      
      return user;
    } catch (error) {
      handleAuthError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, handleAuthSuccess, navigate, sessionLockout, toast]);

  // Sign up new user
  const signUp = useCallback(async (data: RegisterDto) => {
    try {
      setLoading(true);
      const user = await authService.register(data);
      
      // Handle successful registration
      handleAuthSuccess(user);
      
      // Redirect to onboarding
      navigate('/onboarding');
      
      // Show success message
      toast({
        title: 'Registration successful',
        description: 'Your account has been created!',
      });
      
      return user;
    } catch (error) {
      handleAuthError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, handleAuthSuccess, navigate, toast]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data
      setUser(null);
      setSessionExpiresAt(null);
      
      // Redirect to login
      navigate('/login');
    }
  }, [navigate]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      await authService.refreshToken();
      
      // Update session expiration
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + SESSION_TIMEOUT);
      setSessionExpiresAt(expiresAt);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await signOut();
      return false;
    }
  }, [signOut]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        
        if (user) {
          setUser(user);
          
          // Get token expiration from TokenManager
          const token = tokenManager.getAccessToken();
          if (token) {
            const decoded = tokenManager.decodeToken<ExtendedJwtPayload>(token);
            if (decoded?.exp) {
              const expiresAt = new Date(decoded.exp * 1000);
              setSessionExpiresAt(expiresAt);
              
              // Set up token refresh timer
              const now = new Date();
              const timeUntilExpiry = expiresAt.getTime() - now.getTime();
              const refreshTime = Math.max(0, timeUntilExpiry - TOKEN_REFRESH_MARGIN);
              
              if (refreshTime > 0) {
                const refreshTimer = setTimeout(() => {
                  refreshToken().catch(console.error);
                }, refreshTime);
                
                return () => clearTimeout(refreshTimer);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await signOut();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up session check interval
    const sessionCheckInterval = setInterval(() => {
      const now = new Date();
      if (sessionExpiresAt && now >= sessionExpiresAt) {
        signOut().catch(console.error);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(sessionCheckInterval);
  }, [navigate, refreshToken, sessionExpiresAt, signOut, tokenManager]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    authReady: !loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshToken,
    isAuthenticated,
    hasPermission,
    isLoading: loading,
    sessionExpiresAt,
  }), [
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshToken,
    isAuthenticated,
    hasPermission,
    sessionExpiresAt,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
