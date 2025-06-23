import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './NewAuthContext';

/**
 * Custom hook to access the auth context
 * @returns AuthContextType with user authentication state and methods
 * @throws {Error} If used outside of an AuthProvider
 */
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { useAuth };
export type { AuthContextType } from './NewAuthContext';
