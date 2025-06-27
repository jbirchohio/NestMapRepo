import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth as useAuthContext } from '@/state/contexts/AuthContext';
import type { User } from '@/shared/types/user/User';

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Please use the new auth context hook: `useAuth()` from '@/state/contexts/AuthContext' instead.
 * 
 * This is a compatibility layer that maps the old API to the new auth context.
 */
export function useAuth() {
    // Use the new auth context
    const {
        isAuthenticated,
        isLoading,
        error,
        user,
        token,
        login: loginContext,
        logout: logoutContext,
        register: registerContext,
    } = useAuthContext();
    
    const [, setLocation] = useLocation();
    
    // Map the new context to the old API for backward compatibility
    const login = useCallback(async (email: string, password: string) => {
        try {
            const result = await loginContext(email, password);
            return result.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }, [loginContext]);
    
    const logout = useCallback(() => {
        logoutContext();
        setLocation('/login');
    }, [logoutContext, setLocation]);
    
    const register = useCallback(async (userData: any) => {
        try {
            const result = await registerContext(userData);
            return result.user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }, [registerContext]);
    
    // Map the state to match the old API
    const state = {
        user: user as User | null,
        token,
        isAuthenticated,
        isLoading,
        error: error?.message || null,
    };
    
    return {
        ...state,
        login,
        logout,
        register,
    };
}

export default useAuth;
