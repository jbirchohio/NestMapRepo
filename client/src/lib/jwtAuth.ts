/**
 * JWT-only Authentication System
 * Uses the API client for authentication requests
 */
/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the new auth context at '@/contexts/auth/NewAuthContext' instead.
 */
import apiClient from '../services/api/apiClient'; // Default import
interface User {
    id: number;
    email: string;
    username: string;
    role: string;
    organization_id: number;
}
interface AuthResponse {
    user: User;
    token: string;
}
interface LoginRequest {
    email: string;
    password: string;
}
interface RegisterRequest extends LoginRequest {
    username: string;
}
class JWTAuth {
    private token: string | null = null;
    private user: User | null = null;
    constructor() {
        // Load token from localStorage on initialization
        this.token = localStorage.getItem('auth_token');
        if (this.token) {
            this.loadUserFromToken();
        }
    }
    private loadUserFromToken() {
        if (!this.token)
            return;
        try {
            // Decode JWT payload (basic decode without verification - server will verify)
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            this.user = {
                id: payload.id,
                email: payload.email,
                username: payload.username,
                role: payload.role,
                organization_id: payload.organization_id
            };
        }
        catch (error) {
            console.warn('Failed to decode token:', error);
            this.signOut();
        }
    }
    async signIn(email: string, password: string): Promise<{
        user: User | null;
        error: Error | null;
    }> {
        try {
            const data = await apiClient.post<AuthResponse, LoginRequest>('/auth/login', {
                email,
                password
            });
            if (!data.token || !data.user) {
                throw new Error('Invalid response from server');
            }
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('auth_token', this.token);
            this.updateAuthState(this.user, this.token);
            return { user: this.user, error: null };
        }
        catch (error) {
            this.updateAuthState(null, null);
            return {
                user: null,
                error: error instanceof Error ? error : new Error('Login failed')
            };
        }
    }
    async signUp(email: string, password: string, username: string): Promise<{
        user: User | null;
        error: Error | null;
    }> {
        try {
            const data = await apiClient.post<AuthResponse, RegisterRequest>('/auth/register', {
                email,
                password,
                username
            });
            if (!data.token || !data.user) {
                throw new Error('Invalid response from server');
            }
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('auth_token', this.token);
            this.updateAuthState(this.user, this.token);
            return { user: this.user, error: null };
        }
        catch (error) {
            this.updateAuthState(null, null);
            return {
                user: null,
                error: error instanceof Error ? error : new Error('Registration failed')
            };
        }
    }
    signOut(): void {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        this.updateAuthState(null, null);
    }
    getUser(): User | null {
        return this.user;
    }
    getToken(): string | null {
        return this.token;
    }
    isAuthenticated(): boolean {
        return this.token !== null && this.user !== null;
    }
    // Auth state change listeners
    private listeners: Array<(user: User | null) => void> = [];
    onAuthStateChange(callback: (user: User | null) => void): () => void {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    private notifyListeners() {
        this.listeners.forEach(callback => callback(this.user));
    }
    // Update internal state and notify listeners
    private updateAuthState(user: User | null, token: string | null) {
        this.user = user;
        this.token = token;
        this.notifyListeners();
    }
}
export const jwtAuth = new JWTAuth();
export type { User };
