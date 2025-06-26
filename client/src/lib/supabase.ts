import { createClient } from '@supabase/supabase-js';
// Supabase connection details from environment variables
const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];
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
export const supabase = createClient(validUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');
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
