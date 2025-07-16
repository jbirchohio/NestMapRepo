import { useState, useEffect } from 'react';
import nextAuthAdapter, { Session } from './nextAuthAdapter';

// Status types for authentication
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Mock for next-auth/react functions
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setStatus('loading');
        const currentSession = await nextAuthAdapter.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setStatus(currentSession ? 'authenticated' : 'unauthenticated');
        }
      } catch (error) {
        console.error('Error loading session:', error);
        if (mounted) {
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    };

    loadSession();

    // Set up interval to refresh session
    const interval = setInterval(loadSession, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    data: session,
    status,
    update: async () => {
      const updatedSession = await nextAuthAdapter.getSession();
      setSession(updatedSession);
      setStatus(updatedSession ? 'authenticated' : 'unauthenticated');
      return updatedSession;
    }
  };
}

export async function signIn(provider: string, credentials?: { email: string; password: string }) {
  if (provider !== 'credentials' || !credentials) {
    throw new Error('Only credentials provider is supported');
  }

  const session = await nextAuthAdapter.signIn(credentials);
  return session ? { ok: true, error: null } : { ok: false, error: 'Invalid credentials' };
}

export async function signOut() {
  await nextAuthAdapter.signOut();
  return { ok: true };
}

export async function getSession() {
  return nextAuthAdapter.getSession();
}

// Export the adapter for direct access if needed
export { nextAuthAdapter };
