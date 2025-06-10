import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { apiClient } from '../../services/api/apiClient';
import { jwtDecode } from 'jwt-decode';
import { logger } from '../../utils/logger';

// Types and interfaces
interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  email: string;
  role: string;
  organization_id?: number;
  [key: string]: any;
}

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  organization_id: number | null;
  email_verified?: boolean;
  is_active?: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  userId: number | null;
  roleType: 'corporate' | 'agency' | null;
  loading: boolean;
  isLoading: boolean;
  authReady: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  clearTokens: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes before token expires

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load initial auth state
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const tokens = await loadTokens();
        if (tokens) {
          const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
          setUser({
            id: parseInt(decoded.sub),
            email: decoded.email,
            username: decoded.email.split('@')[0],
            role: decoded.role,
            organization_id: decoded.organization_id || null
          });
          setAuthReady(true);
        } else {
          setAuthReady(true);
        }
      } catch (error) {
        logger.error('Error loading auth state:', error);
        clearTokens();
        setAuthReady(true);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Authentication methods
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<AuthTokens>('/auth/login', {
        email,
        password
      });

      if (response) {
        await saveTokens(response);
        const decoded = jwtDecode<JwtPayload>(response.accessToken);
        setUser({
          id: parseInt(decoded.sub),
          email: decoded.email,
          username: decoded.email.split('@')[0],
          role: decoded.role,
          organization_id: decoded.organization_id || null
        });
        navigate('/dashboard');
        toast({
          title: 'Success',
          description: 'Logged in successfully'
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Login failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<AuthTokens>('/auth/register', {
        email,
        password,
        username
      });

      if (response) {
        await saveTokens(response);
        const decoded = jwtDecode<JwtPayload>(response.accessToken);
        setUser({
          id: parseInt(decoded.sub),
          email: decoded.email,
          username,
          role: decoded.role,
          organization_id: decoded.organization_id || null
        });
        navigate('/dashboard');
        toast({
          title: 'Success',
          description: 'Account created successfully'
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Registration failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  const signOut = useCallback(async () => {
    clearTokens();
    setUser(null);
    navigate('/login');
    toast({
      title: 'Logged out',
      description: 'You have been logged out'
    });
    return Promise.resolve();
  }, [navigate, toast]);

  const refreshToken = useCallback(async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens) return;

      const response = await apiClient.post<AuthTokens>('/auth/refresh', {
        refreshToken: tokens.refreshToken
      });

      if (response) {
        await saveTokens(response);
        const decoded = jwtDecode<JwtPayload>(response.accessToken);
        setUser((prevUser) => prevUser && {
          ...prevUser,
          id: parseInt(decoded.sub),
          email: decoded.email,
          role: decoded.role,
          organization_id: decoded.organization_id || null
        });
      }
    } catch (error) {
      logger.error('Token refresh failed:', error);
      clearTokens();
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  // Token management
  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  const isAuthenticated = useCallback(() => {
    const tokens = loadTokens();
    if (!tokens) return false;
    try {
      const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
      return Date.now() < decoded.exp * 1000;
    } catch (error) {
      return false;
    }
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    // This should be replaced with actual permission checking logic
    // based on user's role and organization
    return true;
  }, [user]);

  const signInWithProvider = useCallback(async (provider: string) => {
    try {
      setLoading(true);
      setError(null);

      // This would integrate with OAuth providers
      // For now, we'll show a message that it's not implemented
      toast({
        title: "Coming Soon",
        description: `${provider} sign-in will be available soon.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Provider sign-in failed';
      setError(errorMessage);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Token storage utilities
  const saveTokens = async (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  };

  const loadTokens = () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (accessToken && refreshToken) {
      return {
        accessToken,
        refreshToken
      };
    }
    return null;
  };

  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    roleType: user?.role === 'corporate' ? 'corporate' : user?.role === 'agency' ? 'agency' : null,
    loading,
    isLoading: loading,
    authReady,
    error,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshToken,
    clearTokens,
    isAuthenticated,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
