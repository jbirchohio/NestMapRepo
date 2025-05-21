import { createClient } from '@supabase/supabase-js';

// Supabase connection details
// In development, we're using the values directly for testing
// In production, these should come from environment variables
const supabaseUrl = 'https://yjgbbssrybxqpcrzqefb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZ2Jic3NyeWJ4cXBjcnpxZWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MzA5OTYsImV4cCI6MjA2MzQwNjk5Nn0.6RlJ2cUvx9C-OJ1XYcfSc_bFoql8pcbFIKnR8h6U0eo';

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    
    return { data, error };
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { data, error };
  },

  // Sign in with OAuth provider
  signInWithProvider: async (provider: 'google' | 'github' | 'facebook') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider
    });
    
    return { data, error };
  },
  
  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  
  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },
  
  // Get session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },
  
  // Set up auth state change listener
  onAuthStateChange: (callback: (event: any, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};