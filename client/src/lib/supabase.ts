import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Supabase connection details from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is required but not set');
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is required but not set');
}

// Validate URL format
let validUrl = supabaseUrl;
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  validUrl = `https://${supabaseUrl}`;
}

// Create the Supabase client with error handling
export const supabase = createClient<Database>(
  validUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Define custom response interfaces
interface AuthDataResponse {
  data: any;
  error: any;
}

interface UserResponse {
  user: any | null;
  error: any;
}

interface SessionResponse {
  session: any | null;
  error: any;
}

// Updated auth helper functions to work with Supabase v2.51.0
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, metadata: Record<string, unknown> = {}): Promise<AuthDataResponse> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { data: response.data, error: response.error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<AuthDataResponse> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).signInWithPassword({
        email,
        password
      });
      return { data: response.data, error: response.error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign in with OAuth provider
  signInWithProvider: async (provider: 'google' | 'github' | 'facebook'): Promise<AuthDataResponse> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { data: response.data, error: response.error };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  // Sign out
  signOut: async (): Promise<{ error: any }> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).signOut();
      return { error: response.error };
    } catch (error) {
      return { error };
    }
  },
  
  // Get current user
  getUser: async (): Promise<UserResponse> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).getUser();
      return { user: response?.data?.user || null, error: response.error };
    } catch (error) {
      return { user: null, error };
    }
  },
  
  // Get session
  getSession: async (): Promise<SessionResponse> => {
    try {
      // Using any type to bypass TypeScript errors with Supabase API
      const response = await (supabase.auth as any).getSession();
      return { session: response?.data?.session || null, error: response.error };
    } catch (error) {
      return { session: null, error };
    }
  },
  
  // Get current user (alias)
  getCurrentUser: async (): Promise<UserResponse> => {
    return auth.getUser();
  },
  
  // Get current session (alias)
  getCurrentSession: async (): Promise<SessionResponse> => {
    return auth.getSession();
  },
  
  // Set up auth state change listener
  onAuthStateChange: (callback: (event: string, session: any | null) => void) => {
    // Using any type to bypass TypeScript errors with Supabase API
    const response = (supabase.auth as any).onAuthStateChange(callback);
    return response.data.subscription;
  }
};
