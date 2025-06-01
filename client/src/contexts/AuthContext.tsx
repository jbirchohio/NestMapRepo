import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userId: number | null; // Database user ID
  roleType: 'corporate' | 'agency' | null; // Business mode
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
  const [roleType, setRoleType] = useState<'corporate' | 'agency' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    async function loadUser() {
      try {
        // First check for demo session
        const demoCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (demoCheck.ok) {
          const demoData = await demoCheck.json();
          if (demoData.user && demoData.user.isDemo) {
            // Handle demo user
            setUser({
              id: String(demoData.user.id),
              email: demoData.user.email,
              role: demoData.user.role,
              user_metadata: { 
                display_name: demoData.user.displayName,
                role: demoData.user.role
              }
            } as User);
            setUserId(demoData.user.id);
            setRoleType('corporate');
            setAuthReady(true);
            setLoading(false);
            return;
          }
        }

        // Clear any leftover demo mode data to ensure real authentication works
        localStorage.removeItem('demo-mode');
        localStorage.removeItem('demo-user');

        // Get current auth state
        const { user, error } = await auth.getUser();
        
        if (error) {
          throw new Error(error.message);
        }
        
        setUser(user);
        
        // If user is authenticated, get their database user ID and establish session
        if (user) {
          try {
            const response = await fetch(`/api/users/auth/${user.id}`);
            if (response.ok) {
              const dbUser = await response.json();
              console.log('Database user found:', dbUser);
              setUserId(dbUser.id);
              setRoleType(dbUser.roleType || null);
              
              // Establish backend session for authenticated user with JWT verification
              try {
                // Get the current session to access the access token
                const sessionResult = await auth.getSession();
                const accessToken = sessionResult.session?.access_token;
                
                if (accessToken) {
                  const sessionResponse = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      authId: user.id,
                      token: accessToken 
                    })
                  });
                  
                  if (sessionResponse.ok) {
                    const sessionResult = await sessionResponse.json();
                    console.log('Secure backend session established on load:', sessionResult);
                  } else {
                    console.warn('Failed to establish secure backend session on load');
                  }
                } else {
                  console.warn('No access token available for session establishment');
                }
              } catch (sessionError) {
                console.error('Error establishing secure backend session on load:', sessionError);
              }
            } else if (response.status === 404) {
              // User not found in database - this is expected for new users
              console.log('Database user not found for auth user:', user.id, '- this is normal for new users');
              setUserId(null);
              setRoleType(null);
            } else {
              console.warn('Unexpected response when fetching database user:', response.status);
              setUserId(null);
              setRoleType(null);
            }
          } catch (dbError) {
            console.warn('Network error fetching database user (non-critical):', dbError);
            // Don't treat this as a fatal error - user can still use the app
            setUserId(null);
            setRoleType(null);
          }
        } else {
          setUserId(null);
          setRoleType(null);
        }
      } catch (err: any) {
        // Only log actual errors, not empty objects
        if (err && (err.message || err.error || Object.keys(err).length > 0)) {
          console.error('Error loading user:', err);
          setError(err.message || 'Authentication error occurred');
        } else {
          // Clear any previous error state
          setError(null);
        }
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
      
      // Reset userId when user logs out
      if (!session?.user) {
        setUserId(null);
      }
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
      
      console.log('ACTUAL SIGN-IN USER:', { id: data.user?.id, email: data.user?.email });
      setUser(data.user);
      
      // Get database user ID and establish session for the authenticated user
      if (data.user) {
        try {
          const response = await fetch(`/api/users/auth/${data.user.id}`);
          if (response.ok) {
            const dbUser = await response.json();
            console.log('Sign-in: Database user found:', dbUser);
            setUserId(dbUser.id);
            
            // Establish secure backend session with JWT verification
            try {
              const accessToken = data.session?.access_token;
              
              if (accessToken) {
                const sessionResponse = await fetch('/api/auth/session', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    authId: data.user.id,
                    token: accessToken 
                  })
                });
                
                if (sessionResponse.ok) {
                  const sessionResult = await sessionResponse.json();
                  console.log('Secure backend session established:', sessionResult);
                } else {
                  console.warn('Failed to establish secure backend session');
                }
              } else {
                console.warn('No access token available for session establishment');
              }
            } catch (sessionError) {
              console.error('Error establishing secure backend session:', sessionError);
            }
            
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
        console.error('Supabase signup error:', error);
        throw new Error(error.message || 'Failed to create account with authentication service');
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
              role_type: metadata?.role_type || 'corporate',
              company: metadata?.company || null,
              job_title: metadata?.job_title || null,
              team_size: metadata?.team_size || null,
              use_case: metadata?.use_case || null,
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
      const errorMessage = err.message || 'Authentication service unavailable. Please check your credentials.';
      setError(errorMessage);
      toast({
        title: "Sign-up failed",
        description: errorMessage,
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
      console.log('Starting signOut process...');
      setLoading(true);
      setError(null);
      
      // Check if this is a demo user
      const isDemo = (user as any)?.isDemo || user?.email?.includes('@velocitytrips.com') || user?.email?.includes('@orbit') || user?.email?.includes('admin@orbit') || user?.email?.includes('manager@orbit') || user?.email?.includes('agent@orbit');
      
      console.log('Is demo user:', isDemo, 'User email:', user?.email);
      
      if (isDemo) {
        console.log('Processing demo logout...');
        // For demo users, call the backend logout endpoint
        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });
          console.log('Logout response:', response.status, await response.text());
        } catch (e) {
          console.warn('Demo logout request failed, but continuing with client-side cleanup', e);
        }
        
        // Clear demo mode
        localStorage.removeItem('demo-mode');
        localStorage.removeItem('demo-user');
        
        // Clear all state immediately
        setUser(null);
        setUserId(null);
        setRoleType(null);
        setAuthReady(false);
        setLoading(false);
        
        console.log('Redirecting to demo page...');
        // Redirect to demo page
        window.location.href = '/demo';
        return;
      }
      
      // For regular Supabase users
      const { error } = await auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Clear all state immediately
      setUser(null);
      setUserId(null);
      setRoleType(null);
      setAuthReady(false);
      setLoading(false);
      
      // Force reload to clear any cached state
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError(err.message);
      toast({
        title: "Sign-out failed",
        description: err.message,
        variant: "destructive",
      });
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
    roleType,
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