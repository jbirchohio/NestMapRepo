import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { authService } from '@/services/authService';
import { TokenManager } from '@/utils/tokenManager';
import { SessionLockout } from '@/utils/sessionLockout';
import type { UserResponse, RegisterDto, LoginDto } from '@shared/types/auth/dto';
import type { JwtPayload } from '@shared/types/auth/jwt';
import type { AuthError, Permission, AuthUser, AuthTokens } from '@shared/types/auth/auth.types';

// Use the shared JwtPayload type which already includes standard claims
// and extend it with any custom claims if needed
type ExtendedJwtPayload = JwtPayload & {
  permissions?: string[];
  tenantId?: string;
  email?: string;
  role?: string;
  organization_id?: string | null;
};

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
  const checkUserPermission = useCallback((permission: Permission | string): boolean => {
    if (!user?.permissions) return false;
    const permissionStr = typeof permission === 'string' ? permission : `${permission.resource}:${permission.action}`;
    return user.permissions.includes(permissionStr);
  }, [user]);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((tokens: AuthTokens, userData: UserResponse): AuthUser => {
    // Set tokens in the token manager
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    
    // Convert UserResponse to AuthUser
    const authUser: AuthUser = {
      ...userData,
      permissions: [], // Permissions will be populated from the token
      // Map UserResponse properties to AuthUser, handling both snake_case and camelCase
      firstName: (userData as any).first_name || userData.firstName || null,
      lastName: (userData as any).last_name || userData.lastName || null,
      emailVerified: (userData as any).email_verified ?? userData.emailVerified ?? false,
      createdAt: (userData as any).created_at || userData.createdAt,
      updatedAt: (userData as any).updated_at || userData.updatedAt,
      lastLoginAt: (userData as any).last_login_at || userData.lastLoginAt || null,
      displayName: userData.displayName || 
                 (userData as any).display_name || 
                 `${(userData as any).first_name || userData.firstName || ''} ${(userData as any).last_name || userData.lastName || ''}`.trim() || 
                 userData.email || '',
      avatarUrl: (userData as any).avatar_url || userData.avatarUrl || null,
      tenantId: (userData as any).tenant_id || (userData as any).tenantId || ''
    };
    
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
      
      // Create a properly typed AuthUser object
      const user: AuthUser = {
        ...authUser,
        // Ensure all required properties are set with proper fallbacks
        firstName: (authUser as any).firstName ?? (authUser as any).first_name ?? null,
        lastName: (authUser as any).lastName ?? (authUser as any).last_name ?? null,
        emailVerified: (authUser as any).emailVerified ?? (authUser as any).email_verified ?? false,
        createdAt: (authUser as any).createdAt ?? (authUser as any).created_at ?? new Date().toISOString(),
        updatedAt: (authUser as any).updatedAt ?? (authUser as any).updated_at ?? new Date().toISOString(),
        lastLoginAt: (authUser as any).lastLoginAt ?? (authUser as any).last_login_at ?? null,
        displayName: (authUser as any).displayName ?? (authUser as any).display_name ?? 
                    ((`${(authUser as any).firstName || (authUser as any).first_name || ''} ${(authUser as any).lastName || (authUser as any).last_name || ''}`.trim() || email) as string),
        permissions: (authUser as any).permissions ?? [],
        tenantId: (authUser as any).tenantId ?? (authUser as any).tenant_id ?? ''
      };
      
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
      const displayName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || email;
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
      
      // Create a properly typed AuthUser object
      const user: AuthUser = {
        ...authUser,
        // Ensure all required properties are set with proper fallbacks
        firstName: (authUser as any).firstName ?? (authUser as any).first_name ?? null,
        lastName: (authUser as any).lastName ?? (authUser as any).last_name ?? null,
        emailVerified: (authUser as any).emailVerified ?? (authUser as any).email_verified ?? false,
        createdAt: (authUser as any).createdAt ?? (authUser as any).created_at ?? new Date().toISOString(),
        updatedAt: (authUser as any).updatedAt ?? (authUser as any).updated_at ?? new Date().toISOString(),
        lastLoginAt: (authUser as any).lastLoginAt ?? (authUser as any).last_login_at ?? null,
        displayName: (authUser as any).displayName ?? (authUser as any).display_name ?? 
                    ((`${(authUser as any).firstName || (authUser as any).first_name || ''} ${(authUser as any).lastName || (authUser as any).last_name || ''}`.trim() || data.email) as string),
        permissions: (authUser as any).permissions ?? [],
        tenantId: (authUser as any).tenantId ?? (authUser as any).tenant_id ?? ''
      };
      
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
      
      // Show success message
      const displayName = user.displayName || data.email;
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
          // Convert UserResponse to AuthUser
          // Handle both snake_case and camelCase properties from the backend
          const authUser: AuthUser = {
            // Copy all properties from currentUser (UserResponse)
            ...currentUser,
            // Add required AuthUser properties
            permissions: [], // Will be populated from the token
            tenantId: (currentUser as any).tenantId || (currentUser as any).tenant_id || '',
            
            // Map snake_case to camelCase with fallbacks
            displayName: (currentUser as any).displayName || (currentUser as any).display_name || '',
            emailVerified: (currentUser as any).emailVerified ?? (currentUser as any).email_verified ?? false,
            firstName: (currentUser as any).firstName || (currentUser as any).first_name || null,
            lastName: (currentUser as any).lastName || (currentUser as any).last_name || null,
            createdAt: (currentUser as any).createdAt || (currentUser as any).created_at || new Date().toISOString(),
            updatedAt: (currentUser as any).updatedAt || (currentUser as any).updated_at || new Date().toISOString(),
            lastLoginAt: (currentUser as any).lastLoginAt || (currentUser as any).last_login_at || null,
            avatarUrl: (currentUser as any).avatarUrl || (currentUser as any).avatar_url || null
          };
          
          // Set displayName if not already set
          if (!authUser.displayName) {
            const firstName = (authUser as any).first_name || (authUser as any).firstName || '';
            const lastName = (authUser as any).last_name || (authUser as any).lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            authUser.displayName = fullName || (authUser as any).email || '';
          }
          
          if (isMounted) {
            setUser(authUser);
          }
          
          // Get token expiration from TokenManager
          const token = tokenManager.getAccessToken();
          if (token) {
            const decoded = tokenManager.decodeToken(token) as ExtendedJwtPayload;
            if (decoded?.exp) {
              const expiresAt = new Date(decoded.exp * 1000);
              
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