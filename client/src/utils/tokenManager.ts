import { jwtDecode } from 'jwt-decode';
import { NavigateFunction } from 'react-router-dom';
import { SecureCookie } from './cookies';
import config from '@/config/env';
import type { JwtPayload, AccessTokenPayload } from '@shared/schema/types/auth/jwt';
import type { AuthTokens } from '@shared/schema/types/auth/dto/auth-response.dto';

// Constants
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Extend Window interface to include __tokenManager
declare global {
    interface Window {
        __tokenManager?: TokenManager;
    }
}

// Show toast notification function
const showToast = (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
}) => {
    // This is a placeholder - the actual implementation should be imported from your UI library
    console.log(`[Toast] ${options.title}: ${options.description}`);
};

export class TokenManager {
    private static instance: TokenManager | null = null;
    private accessToken: string | null;
    private tokenRotationTimeout: ReturnType<typeof setTimeout> | null;
    private refreshToken: string | null;
    private navigate: NavigateFunction | null;

    private constructor(navigate: NavigateFunction | null) {
        // Initialize all properties
        this.accessToken = null;
        this.tokenRotationTimeout = null;
        this.refreshToken = null;
        this.navigate = navigate;

        // Load tokens from storage
        this.refreshToken = SecureCookie.get(REFRESH_TOKEN_KEY) || null;
        this.accessToken = SecureCookie.get(TOKEN_KEY) || null;

        // Start token rotation if we have a refresh token
        if (this.refreshToken) {
            const decoded = this.getDecodedToken();
            if (decoded?.exp) {
                const expiresIn = (decoded.exp * 1000) - Date.now();
                this.startTokenRotation(expiresIn);
            }
            else if (config.TOKEN_ROTATION_INTERVAL) {
                // Fallback to config interval if we can't decode the token
                this.startTokenRotation(config.TOKEN_ROTATION_INTERVAL);
            }
        }

        // Store the instance in window for debugging
        if (typeof window !== 'undefined') {
            window.__tokenManager = this;
        }
    }

    public static getInstance(navigate?: NavigateFunction): TokenManager {
        if (!TokenManager.instance) {
            if (!navigate && typeof window !== 'undefined') {
                throw new Error('Navigate function is required for TokenManager initialization');
            }
            TokenManager.instance = new TokenManager(navigate || null);
        }
        else if (navigate && !TokenManager.instance.navigate) {
            // Update navigate function if a new one is provided
            TokenManager.instance.navigate = navigate;
        }
        return TokenManager.instance;
    }

    public static clearInstance(): void {
        TokenManager.instance = null;
    }

    public hasValidToken(): boolean {
        if (!this.accessToken) return false;

        try {
            const decoded = jwtDecode<AccessTokenPayload>(this.accessToken);
            const now = Date.now() / 1000;

            // Ensure the token has the correct type and expiration
            if (decoded.type !== 'access' || !decoded.exp) return false;

            return decoded.exp > now;
        } catch (error) {
            console.error('Failed to validate token:', error);
            return false;
        }
    }

    public getAccessToken(): string | null {
        return SecureCookie.get(TOKEN_KEY);
    }

    public getRefreshToken(): string | null {
        return this.refreshToken;
    }

    /**
     * Refreshes the access token using the refresh token
     * @returns New access token or null if refresh fails
     */
    public async refreshTokens(): Promise<string | null> {
        if (!this.refreshToken) {
            console.warn('No refresh token available');
            return null;
        }

        try {
            // Use the refresh token to get a new access token
            const response = await fetch(`${config.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` }),
                },
                credentials: 'include', // For httpOnly cookies
                body: JSON.stringify({
                    refresh_token: this.refreshToken,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Failed to refresh token: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json() as AuthTokens;

            if (!data?.accessToken) {
                throw new Error('Invalid token response: missing accessToken');
            }

            // If refreshToken is not provided in the response, keep the existing one
            const newRefreshToken = data.refreshToken || this.refreshToken;

            // Update tokens
            this.setTokens(data.accessToken, newRefreshToken);

            // Restart token rotation with the new token
            const decoded = this.getDecodedToken();
            if (decoded?.exp) {
                const expiresIn = (decoded.exp * 1000) - Date.now();
                this.startTokenRotation(expiresIn);
            }

            return data.accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearTokens();

            // Notify the user if needed
            if (error instanceof Error) {
                showToast({
                    title: 'Session Expired',
                    description: 'Your session has expired. Please log in again.',
                    variant: 'destructive',
                });
            }

            return null;
        }
    }

    /**
     * Checks if the current user is authenticated
     * @returns true if authenticated, false otherwise
     */
    public isAuthenticated(): boolean {
        // Check if we have a valid access token
        const token = this.accessToken || SecureCookie.get(TOKEN_KEY);
        if (!token) {
            return false;
        }

        try {
            // Use getDecodedToken which handles validation and expiration
            const decoded = this.getDecodedToken();
            // If we have a valid decoded token with a subject, we're authenticated
            return !!decoded?.sub;
        } catch (error) {
            return false;
        }
    }

    public getTokenExpiration(): number | null {
        if (!this.accessToken) return null;
        const decoded = this.decodeToken(this.accessToken);
        return decoded?.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    }

    /**
     * Sets both access and refresh tokens
     * @param accessToken The new access token
     * @param refreshToken The new refresh token
     * @throws {Error} If tokens are invalid or missing required fields
     */
    public setTokens(accessToken: string, refreshToken: string): void {
        // Validate input
        if (!accessToken || !refreshToken) {
            throw new Error('Both access token and refresh token are required');
        }

        // Decode and validate the access token
        const decodedAccessToken = this.decodeToken(accessToken);
        if (!decodedAccessToken) {
            throw new Error('Invalid access token: failed to decode');
        }

        // Validate required token fields
        if (!decodedAccessToken.sub) {
            throw new Error('Invalid access token: missing subject (sub)');
        }

        if (!decodedAccessToken.exp) {
            throw new Error('Invalid access token: missing expiration (exp)');
        }

        // Store tokens in memory
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;

        // Calculate token expiration time (with 5 minute buffer)
        const expiresIn = Math.max(0, (decodedAccessToken.exp * 1000) - Date.now() - (5 * 60 * 1000));

        try {
            // Store tokens in secure cookies
            SecureCookie.set(TOKEN_KEY, accessToken, {
                expires: new Date(decodedAccessToken.exp * 1000),
                secure: window.location.protocol === 'https:',
                sameSite: 'strict',
                path: '/',
            });

            // Store refresh token with longer expiration (30 days)
            const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            SecureCookie.set(REFRESH_TOKEN_KEY, refreshToken, {
                expires: refreshExpires,
                secure: window.location.protocol === 'https:',
                sameSite: 'strict',
                path: '/',
            });

            // Restart token rotation with the new token
            this.startTokenRotation(expiresIn);

        } catch (error) {
            console.error('Failed to store tokens:', error);
            // Clear tokens if storage fails
            this.clearTokens();
            throw error;
        }
    }

    public destroyTokens(): void {
        if (this.tokenRotationTimeout) {
            clearTimeout(this.tokenRotationTimeout);
        }
        this.accessToken = null;
        this.refreshToken = null;
        this.clearStoredTokens();
    }

    /**
     * Clears all tokens from memory and stops any active refresh operations
     */
    public clearTokens(): void {
        // Stop any ongoing token refresh operations
        this.stopTokenRotation();

        // Clear in-memory tokens
        this.accessToken = null;
        this.refreshToken = null;

        // Clear stored tokens
        this.clearStoredTokens();

        // Notify any listeners that tokens were cleared
        this.notifyTokenCleared();
    }

    /**
     * Clears tokens from all storage mechanisms
     */
    private clearStoredTokens(): void {
        try {
            const cookieOptions = {
                path: '/',
                secure: window.location.protocol === 'https:',
                sameSite: 'strict' as const,
            };

            // Clear from cookies
            SecureCookie.remove(TOKEN_KEY, cookieOptions);
            SecureCookie.remove(REFRESH_TOKEN_KEY, cookieOptions);

            // Clear from all other storage mechanisms
            if (typeof window !== 'undefined') {
                // Clear from localStorage and sessionStorage
                window.localStorage.removeItem(TOKEN_KEY);
                window.sessionStorage.removeItem(TOKEN_KEY);
                window.localStorage.removeItem(REFRESH_TOKEN_KEY);
                window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
            }
        } catch (error) {
            console.error('Error clearing stored tokens:', error);
        }
    }

    /**
     * Notifies any listeners that tokens were cleared
     */
    private notifyTokenCleared(): void {
        // This can be expanded to use an event emitter or other notification system
        console.log('Authentication tokens were cleared');

        // Optionally dispatch a custom event that other parts of the app can listen for
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-tokens-cleared'));
        }
    }

    public getTokenState(): {
        accessToken: string | null;
        refreshToken: string | null;
        isValid: boolean;
        expiresIn: number;
    } {
        const expiresIn = this.getTokenExpiration() ? this.getTokenExpiration()! - Date.now() : 0;
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            isValid: this.isAuthenticated(),
            expiresIn: Math.max(0, expiresIn) // Ensure non-negative
        };
    }

    public isTokenValid(): boolean {
        return this.isAuthenticated();
    }

    /**
     * Decodes and validates the current access token
     * @returns Decoded token payload or null if invalid/expired
     */
    public getDecodedToken(): JwtPayload | null {
        const token = this.accessToken || SecureCookie.get(TOKEN_KEY);
        if (!token) {
            return null;
        }

        try {
            const decoded = this.decodeToken(token);
            if (!decoded) {
                return null;
            }

            // Check if token is expired
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                console.warn('Token has expired');
                // Clear expired token
                this.clearTokens();
                return null;
            }

            return decoded;
        } catch (error) {
            console.error('Error in getDecodedToken:', error);
            return null;
        }
    }

    public getTokenType(): string {
        const decoded = this.getDecodedToken();
        return decoded ? decoded.type || 'access' : 'unknown';
    }

    public getTokenScope(): string[] {
        const decoded = this.getDecodedToken();
        if (!decoded) return [];

        // For access tokens, use the permissions array
        if (decoded.type === 'access' && 'permissions' in decoded) {
            return Array.isArray(decoded.permissions) ? decoded.permissions : [];
        }

        // For other token types or if no permissions are found
        return [];
    }

    /**
     * Starts the token rotation process
     * @param expiresIn Time in milliseconds until the token expires
     */
    private startTokenRotation(expiresIn: number): void {
        // Clear any existing rotation timeout
        this.stopTokenRotation();

        // Don't start rotation if token is already expired or about to expire
        if (expiresIn <= 0) {
            console.warn('Token is already expired or about to expire');
            return;
        }

        // Calculate when to refresh the token (5 minutes before expiration)
        const refreshTime = Math.max(0, expiresIn - (5 * 60 * 1000));

        console.log(`Starting token rotation. Will refresh in ${Math.floor(refreshTime / 1000)} seconds`);

        // Set up the refresh timeout
        this.tokenRotationTimeout = setTimeout(async () => {
            try {
                console.log('Rotating access token...');
                const newToken = await this.refreshTokens();
                if (!newToken) {
                    console.warn('Token rotation failed - no new token received');
                    this.clearTokens();
                }
            } catch (error) {
                console.error('Error during token rotation:', error);
                this.clearTokens();
            }
        }, refreshTime);
    }

    /**
     * Stops the token rotation process
     */
    private stopTokenRotation(): void {
        if (this.tokenRotationTimeout) {
            clearTimeout(this.tokenRotationTimeout);
            this.tokenRotationTimeout = null;
        }
    }

    /**
     * Cleans up the TokenManager instance and clears all tokens
     */
    public destroy(): void {
        // Stop any ongoing token rotation
        this.stopTokenRotation();

        // Clear tokens from memory and storage
        this.clearTokens();

        // Remove instance reference
        if (TokenManager.instance === this) {
            TokenManager.instance = null;
        }

        // Remove from window if it exists
        if (typeof window !== 'undefined' && window.__tokenManager === this) {
            delete window.__tokenManager;
        }

        console.log('TokenManager instance destroyed');
    }

    /**
     * Gets the user ID from the access token if available
     * @returns The user ID or an empty string if not available
     */
    public getUserId(): string {
        const token = this.accessToken || SecureCookie.get(TOKEN_KEY);
        if (!token) {
            return '';
        }

        try {
            const decoded = this.decodeToken(token);
            if (!decoded) {
                return '';
            }

            // Check if the token has expired
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                return '';
            }

            return decoded.sub || '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Decodes a JWT token and validates its structure
     * @param token The JWT token to decode
     * @returns Decoded token payload or null if invalid
     */
    public decodeToken(token: string): JwtPayload | null {
        if (!token) {
            return null;
        }

        try {
            const decoded = jwtDecode<JwtPayload>(token);

            // Basic validation of required JWT fields
            if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
                console.error('Invalid token structure:', decoded);
                return null;
            }

            return decoded;
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }
}
