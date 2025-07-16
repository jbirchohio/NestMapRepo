import React from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * AuthStatus component displays the current authentication state
 * This helps debug NextAuth integration issues
 */
export function AuthStatus() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();

  return (
    <div className="p-4 border rounded-lg bg-gray-50 mb-4">
      <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Status: </span>
          {isLoading ? (
            <span className="text-yellow-600">Loading...</span>
          ) : isAuthenticated ? (
            <span className="text-green-600">Authenticated</span>
          ) : (
            <span className="text-red-600">Not Authenticated</span>
          )}
        </div>
        
        {user && (
          <div>
            <span className="font-medium">User: </span>
            <span>{user.email} ({user.role})</span>
          </div>
        )}
        
        <div className="flex space-x-2 pt-2">
          {!isAuthenticated ? (
            <button 
              onClick={() => signIn('demo@example.com', 'password123', { callbackUrl: '/dashboard' })}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Demo Login
            </button>
          ) : (
            <button 
              onClick={() => signOut()}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthStatus;
