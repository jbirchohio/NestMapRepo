/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the new auth context at '@/contexts/auth/NewAuthContext' instead.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
interface User {
    id: number;
    email: string;
    role: string;
    organizationId?: number;
    displayName?: string;
}
interface SimpleAuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}
const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);
export function SimpleAuthProvider({ children }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    // Check current session on load
    useEffect(() => {
        async function checkSession() {
            try {
                const response = await apiRequest('GET', '/api/auth/session');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            }
            catch (error) {
                // No active session
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        }
        checkSession();
    }, []);
    const signIn = async (email: string, password: string) => {
        try {
            const response = await apiRequest('POST', '/api/auth/login', { email, password });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Invalid credentials');
            }
            const data = await response.json();
            setUser(data.user);
        }
        catch (error: any) {
            console.error('Error signing in:', error);
            throw error;
        }
    };
    const signOut = async () => {
        try {
            await apiRequest('POST', '/api/auth/logout');
            setUser(null);
        }
        catch (error) {
            console.error('Error signing out:', error);
            // Clear user state even if logout fails
            setUser(null);
        }
    };
    const refreshUser = async () => {
        try {
            const response = await apiRequest('GET', '/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
            else {
                setUser(null);
            }
        }
        catch (error) {
            setUser(null);
        }
    };
    return (<SimpleAuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </SimpleAuthContext.Provider>);
}
export function useSimpleAuth() {
    const context = useContext(SimpleAuthContext);
    if (context === undefined) {
        throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
    }
    return context;
}
