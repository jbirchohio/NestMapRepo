import React from 'react';

type AuthProviderProps = {
  children: React.ReactNode;
};

/**
 * AuthProvider component for JWT-based authentication
 * Since we're using JWT auth with localStorage, we don't need a complex provider
 * The jwtAuth singleton handles state management and persistence
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // With JWT auth, the authentication state is managed by the jwtAuth singleton
  // and accessed through the useAuth hook. No additional provider context needed.
  return <>{children}</>;
}

export default AuthProvider;
