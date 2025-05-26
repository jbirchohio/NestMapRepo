import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userId: number | null; // Database user ID
  loading: boolean;
  authReady: boolean; // Authentication and database user lookup complete
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github' | 'facebook') => Promise<void>;
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
        // Get current auth state
        const { user, error } = await auth.getUser();
        
        if (error) {
          throw new Error(error.message);
        }
        
        setUser(user);
        
        // If user is authenticated, get their database user ID
        if (user) {
          try {
            const response = await fetch(`/api/users/auth/${user.id}`);
            if (response.ok) {
              const dbUser = await response.json();
              console.log('Database user found:', dbUser);
              setUserId(dbUser.id);
            } else {
              console.warn('Database user not found for auth user:', user.id);
              console.log('Missing database user for auth ID:', user.id, 'Email:', user.email);
              setUserId(null);
            }
          } catch (dbError) {
            console.error('Error fetching database user:', dbError);
            setUserId(null);
          }
        } else {
          setUserId(null);
        }
      } catch (err: any) {
        console.error('Error loading user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setAuthReady(true); // Mark authentication as complete
      }
    }

    loadUser();

    // Set up auth state change listener
    const { data: authListener } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Clean up subscription
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        throw new Error(error.message);
      }
      
      setUser(data.user);
      
      // Get database user ID for the authenticated user
      if (data.user) {
        try {
          const response = await fetch(`/api/users/auth/${data.user.id}`);
          if (response.ok) {
            const dbUser = await response.json();
            console.log('Sign-in: Database user found:', dbUser);
            setUserId(dbUser.id);
            setAuthReady(true);
          } else {
            console.warn('Database user not found for auth user:', data.user.id);
            setUserId(null);
            setAuthReady(true);
          }
        } catch (dbError) {
          console.error('Error fetching database user on sign in:', dbError);
          setUserId(null);
          setAuthReady(true);
        }
      } else {
        setAuthReady(true);
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message);
      toast({
        title: "Sign-in failed",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, metadata: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create user in Supabase
      const { data, error } = await auth.signUp(email, password, metadata);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.user) {
        // Create user in our database
        try {
          const username = email.split('@')[0]; // Generate a simple username from email
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              auth_id: data.user.id,
              username: username,
              email: email,
              display_name: metadata?.display_name || username,
              avatar_url: metadata?.avatar_url || null,
            }),
          });
          
          if (!response.ok) {
            console.warn('User created in Supabase but failed to create in database:', await response.json());
          }
        } catch (dbError) {
          console.error('Error creating user in database:', dbError);
          // Don't block signup if DB insert fails, we'll handle it in the auth state change
        }
      }
      
      setUser(data.user);
      toast({
        title: "Account created",
        description: "Your account has been successfully created.",
      });
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message);
      toast({
        title: "Sign-up failed",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }
      
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError(err.message);
      toast({
        title: "Sign-out failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign in with OAuth provider
  const signInWithProvider = async (provider: 'google' | 'github' | 'facebook') => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await auth.signInWithProvider(provider);
      
      if (error) {
        throw new Error(error.message);
      }
      
      // The user will be redirected to the provider's site, 
      // so we don't need to update the user state here
      toast({
        title: "Redirecting...",
        description: `Redirecting to ${provider} for authentication.`,
      });
    } catch (err: any) {
      console.error(`Error signing in with ${provider}:`, err);
      setError(err.message);
      toast({
        title: "Sign-in failed",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create context value
  const value: AuthContextType = {
    user,
    userId,
    loading,
    authReady,
    error,
    signIn,
    signUp,
    signOut,
    signInWithProvider
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}