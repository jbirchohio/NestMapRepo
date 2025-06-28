import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { authService } from '@/services/authService';
import { TokenManager } from '@/utils/tokenManager';
import { SessionLockout } from '@/utils/sessionLockout';
import { AuthUser, AuthError, AuthTokens, Permission, LoginDto, RegisterDto } from '@shared/types/auth';
import type { JwtPayload } from '@shared/types/auth/jwt';

type UserResponse = AuthUser;

// Type for API responses that might use snake_case
type UserResponseSnakeCase = {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  display_name?: string;
  avatar_url?: string | null;
  tenant_id?: string;
  role?: string;
  organization_id?: string | null;
  permissions?: string[];
};

type UserResponseMixed = UserResponse | UserResponseSnakeCase;

// Type guard for snake_case response
function isSnakeCaseResponse(user: unknown): user is UserResponseSnakeCase {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  return 'first_name' in u || 'last_name' in u || 'email_verified' in u || 'created_at' in u;
}

// Transform user data to AuthUser type
function toAuthUser(userData: UserResponseMixed): AuthUser {
  const isSnake = isSnakeCaseResponse(userData);
  const id = String(userData.id || '');
  const email = String(userData.email || '');
  
  // Handle both snake_case and camelCase properties using bracket notation
  const firstName = isSnake ? userData['first_name'] : (userData as UserResponse)['firstName'];
  const lastName = isSnake ? userData['last_name'] : (userData as UserResponse)['lastName'];
  const emailVerified = isSnake ? userData['email_verified'] : (userData as UserResponse)['emailVerified'];
  const createdAt = isSnake ? userData['created_at'] : (userData as UserResponse)['createdAt'];
  const updatedAt = isSnake ? userData['updated_at'] : (userData as UserResponse)['updatedAt'];
  const lastLoginAt = isSnake ? userData['last_login_at'] : (userData as UserResponse)['lastLoginAt'];
  const displayName = isSnake ? userData['display_name'] : (userData as UserResponse)['displayName'];
  const avatarUrl = isSnake ? userData['avatar_url'] : (userData as UserResponse)['avatarUrl'];
  const tenantId = isSnake ? userData['tenant_id'] : (userData as UserResponse)['tenantId'];
  
  // Generate displayName if not provided
  const finalDisplayName = displayName || 
    [firstName, lastName].filter(Boolean).join(' ').trim() || 
    email;

  return {
    id,
    email,
    firstName: firstName || null,
    lastName: lastName || null,
    emailVerified: emailVerified ?? false,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
    lastLoginAt: lastLoginAt || null,
    displayName: finalDisplayName,
    avatarUrl: avatarUrl || null,
    tenantId: tenantId || '',
    permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
    role: userData.role || 'user',
    organizationId: userData.organization_id || null
  };
}

// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_MARGIN = 60 * 1000; // 1 minute before token expires

// Context type
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authReady: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string, tenantId: string) => Promise<AuthUser | undefined>;
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

// Get client IP from request or context
const getClientIp = (): string => {
  // In a real app, you would get this from the request or a service
  // For now, we'll use a dummy value
  return '127.0.0.1';
};

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tokenManager = useMemo(() => TokenManager.getInstance(navigate), [navigate]);
  const sessionLockout = useMemo(() => SessionLockout.getInstance(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);

  // Check if user is authenticated
  const isUserAuthenticated = useMemo(() => {
    return !!user && tokenManager.hasValidToken();
  }, [user, tokenManager]);

  // Check if user has a specific permission
  const checkUserPermission = useCallback((permission: string | { resource: string; action: string }): boolean => {
    if (!user?.permissions) return false;
    const permissionStr = typeof permission === 'string' ? permission : `${permission.resource}:${permission.action}`;
    return user.permissions.includes(permissionStr);
  }, [user]);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((tokens: AuthTokens, userData: UserResponse): AuthUser => {
    // Set tokens in the token manager
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    
    // Convert UserResponse to AuthUser using our utility function
    const authUser = toAuthUser(userData);
    
    setUser(authUser);
    setError(null);
    setAuthReady(true);
    
    // Set session expiration
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + SESSION_TIMEOUT);
    setSessionExpiresAt(expiresAt);
    
    // Reset session lockout on successful auth
    const clientIp = getClientIp();
    sessionLockout.unlockAccount(clientIp);
    
    return authUser;
  }, [sessionLockout, tokenManager]);

  // Handle authentication errors
  const handleAuthError = useCallback((error: unknown, email: string = ''): AuthError => {
    // Increment failed attempts on authentication error
    const clientIp = getClientIp();
    sessionLockout.recordFailedAttempt(clientIp, email);
    console.error('Authentication error:', error);
    
    let errorMessage = 'An authentication error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    const authError: AuthError = {
      message: errorMessage,
      code: 'AUTH_ERROR',
      status: 401
    };
    
    setError(authError);
    
    // Show error toast
    toast({
      title: 'Authentication Error',
      children: errorMessage,
      variant: 'destructive',
    });
    
    return authError;
  }, [toast, sessionLockout]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser | undefined> => {
    // Get client IP for session lockout
    const currentClientIp = getClientIp();
    
    try {
      setLoading(true);
      
      // Check session lockout
      const lockoutStatus = sessionLockout.getLockoutStatus(currentClientIp);
      if (lockoutStatus.isLocked) {
        throw new Error(`Too many attempts. Please try again in ${Math.ceil(lockoutStatus.remainingTime / 1000)} seconds.`);
      }
      
      // Login with email and password
      const loginDto: LoginDto = { 
        email, 
        password,
        // Add any additional optional fields if needed
        // rememberMe: true,
        // deviceId: 'browser-session' // Uncomment and set a device ID if needed
      };
      
      // Call the auth service to login
      const authUser = await authService.login(loginDto);
      
      // Convert the auth response to a properly typed AuthUser object
      const user = toAuthUser(authUser);
      
      // Update the UI state with the authenticated user
      setUser(user);
      setError(null);
      setAuthReady(true);
      
      // Set session expiration
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + SESSION_TIMEOUT);
      setSessionExpiresAt(expiresAt);
      
      // Reset session lockout on successful auth
      sessionLockout.unlockAccount(currentClientIp);
      
      // Redirect to dashboard or intended URL
      navigate('/dashboard');
      
      // Show success message with safe property access
      const displayName = user?.['displayName'] 
        ?? `${user?.['firstName'] ?? ''} ${user?.['lastName'] ?? ''}`.trim() 
        ?? email;
      toast({
        title: 'Login successful',
        children: `Welcome back, ${displayName}!`,
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
  const signUp = useCallback(async (data: RegisterDto): Promise<void> => {
    try {
      setLoading(true);
      
      // Call the auth service to register
      const authUser = await authService.register(data);
      
      // Convert the auth response to a properly typed AuthUser object
      const user = toAuthUser(authUser);
      
      // Update the UI state with the authenticated user
      setUser(user);
      setError(null);
      setAuthReady(true);
      
      // Set session expiration
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + SESSION_TIMEOUT);
      setSessionExpiresAt(expiresAt);
      
      // Reset session lockout on successful auth if needed
      const clientIp = getClientIp();
      sessionLockout.unlockAccount(clientIp);
      
      // Redirect to onboarding
      navigate('/onboarding');
      
      // Show success message with safe property access
      const displayName = user['displayName'] || data.email;
      toast({
        title: 'Registration successful',
        children: `Welcome, ${displayName}! Your account has been created.`,
      });
    } catch (error) {
      handleAuthError(error, data.email);
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
      tokenManager.clearTokens();
      
      // Redirect to login
      navigate('/login');
    }
  }, [navigate, tokenManager]);

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
    let isMounted = true;
    let refreshTimer: NodeJS.Timeout | null = null;
    
    const checkAuth = async (): Promise<(() => void) | undefined> => {
      try {
        const currentUser = await authService.getCurrentUser();
        
        if (!isMounted) return undefined;
        
        if (currentUser) {
          // Convert currentUser to AuthUser using our utility function
          const authUser = toAuthUser(currentUser);
          
          if (isMounted) {
            setUser(authUser);
          }
          
          // Get token expiration from TokenManager
          const token = tokenManager.getAccessToken();
          if (token) {
            const decoded = tokenManager.decodeToken(token);
            // Check if the decoded token is an access token with required fields
            if (decoded && 'exp' in decoded && 'type' in decoded && decoded.type === 'access') {
              const accessToken = decoded as JwtPayload;
              const expiresAt = new Date(Number(accessToken.exp) * 1000);
              
              if (isMounted) {
                setSessionExpiresAt(expiresAt);
              }
              
              // Set up token refresh timer
              const now = new Date();
              const timeUntilExpiry = expiresAt.getTime() - now.getTime();
              const refreshTime = Math.max(0, timeUntilExpiry - TOKEN_REFRESH_MARGIN);
              
              if (refreshTime > 0) {
                refreshTimer = setTimeout(() => {
                  refreshToken().catch(console.error);
                }, refreshTime);
              }
            }
          }
          
          // Return cleanup function
          return () => {
            if (refreshTimer) {
              clearTimeout(refreshTimer);
            }
          };
        }
        
        return undefined;
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMounted) {
          await signOut();
        }
        return undefined;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Call checkAuth and handle the cleanup
    const cleanupPromise = checkAuth();
    
    // Set up session check interval
    const sessionCheckInterval = setInterval(() => {
      const now = new Date();
      if (sessionExpiresAt && now >= sessionExpiresAt) {
        signOut().catch(console.error);
      }
    }, 60000); // Check every minute
    
    // Cleanup function for the effect
    return () => {
      isMounted = false;
      clearInterval(sessionCheckInterval);
      
      // Clean up any pending refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      
      // Clean up the checkAuth cleanup
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      }).catch(console.error);
    };
  }, [navigate, refreshToken, sessionExpiresAt, signOut, tokenManager]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    authReady,
    error,
    signIn,
    signUp,
    signOut,
    refreshToken,
    isAuthenticated: isUserAuthenticated,
    hasPermission: checkUserPermission,
    isLoading: loading,
    sessionExpiresAt,
  }), [
    user,
    loading,
    authReady,
    error,
    signIn,
    signUp,
    signOut,
    refreshToken,
    isUserAuthenticated,
    checkUserPermission,
    sessionExpiresAt,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;