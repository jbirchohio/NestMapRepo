import React from 'react';
import { SessionProvider } from 'next-auth/react';

type AuthProviderProps = {
  children: React.ReactNode;
  session?: any;
};

/**
 * AuthProvider component that wraps the application with NextAuth SessionProvider
 * This enables the useAuth hook to access authentication state throughout the app
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
  // Configure options for SessionProvider
  const sessionProviderOptions = {
    // Refresh session every 5 minutes to keep it active
    refetchInterval: 5 * 60,
    // Refetch session when window is focused
    refetchOnWindowFocus: true,
  };

  return (
    <SessionProvider session={session} {...sessionProviderOptions}>
      {children}
    </SessionProvider>
  );
}

export default AuthProvider;
