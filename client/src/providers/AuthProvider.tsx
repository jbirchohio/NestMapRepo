import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtAuth, type User } from '@/lib/jwtAuth';
import { getApiClient } from '@/services/api/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  // Store the navigate function globally when component mounts
  useEffect(() => {
    const navigateWrapper = (to: string, options?: { replace?: boolean }) => {
      if (options?.replace) {
        navigate(to, { replace: true });
      } else {
        navigate(to);
      }
    };
    
    // Initialize API client with navigation wrapper
    getApiClient(navigateWrapper);
    
    // Check for existing session
    const checkAuth = async () => {
      try {
        const currentUser = jwtAuth.getUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Failed to check authentication status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const unsubscribe = jwtAuth.onAuthStateChange((authUser) => {
      setUser(authUser);
      if (!authUser) {
        // Clear any sensitive data when user logs out
        // Consider adding cleanup logic here if needed
      }
    });

      // Clean up function
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle sign in
  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await jwtAuth.signIn(email, password);
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.user) {
        throw new Error('Authentication failed: No user data received');
      }
      
      // Set the user state
      setUser(result.user);
      
      // Get the redirect path from URL search params or use default
      const searchParams = new URLSearchParams(window.location.search);
      const redirectPath = searchParams.get('redirect');
      const from = redirectPath || '/dashboard';
      
      // Navigate to the target page
      navigate(from, { replace: true });
      
      return result.user;
    } catch (err) {
      console.error('Sign in failed:', err);
      const error = err instanceof Error ? err : new Error('Failed to sign in');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await jwtAuth.signUp(email, password, username);
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.user) {
        throw new Error('Registration failed: No user data received');
      }
      
      setUser(result.user);
      
      // Redirect to dashboard after successful registration
      navigate('/dashboard', { replace: true });
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle sign out
  const signOut = useCallback(() => {
    jwtAuth.signOut();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);
  
  // Initialize the API client with navigation function
  useEffect(() => {
    const navigateWrapper = (to: string, options?: { replace?: boolean }) => {
      if (options?.replace) {
        navigate(to, { replace: true });
      } else {
        navigate(to);
      }
    };
    
    // Initialize API client with navigation wrapper
    getApiClient(navigateWrapper);
    
    return () => {
      // Cleanup if needed
    };
  }, [navigate]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
