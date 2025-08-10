import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtAuth, User } from '@/lib/jwtAuth';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  userId: number | null;
  loading: boolean;
  authReady: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    async function loadUser() {
      try {
        // Get current auth state from JWT
        const currentUser = jwtAuth.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.id);
        } else {
          setUser(null);
          setUserId(null);
        }
        
        setAuthReady(true);
      } catch (error) {
        console.error('Error loading user:', error);
        setError(error instanceof Error ? error.message : 'Failed to load user');
        setUser(null);
        setUserId(null);
        setAuthReady(true);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Set up auth state change listener
    const unsubscribe = jwtAuth.onAuthStateChange((user) => {
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        setUser(null);
        setUserId(null);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user, error } = await jwtAuth.signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      if (user) {
        setUser(user);
        setUserId(user.id);
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        
        // Track successful login
        analytics.trackLogin('email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user, error } = await jwtAuth.signUp(email, password, username);
      
      if (error) {
        throw error;
      }
      
      if (user) {
        setUser(user);
        setUserId(user.id);
        
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
        
        // Track successful signup
        analytics.trackSignup('email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      jwtAuth.signOut();
      setUser(null);
      setUserId(null);
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
      // Redirect to home page after sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signInWithProvider = async (provider: string) => {
    setLoading(true);
    setError(null);
    
    try {
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
  };

  const value: AuthContextType = {
    user,
    userId,
    loading,
    authReady,
    error,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};