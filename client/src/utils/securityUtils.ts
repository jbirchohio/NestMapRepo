import { TokenManager } from './tokenManager';
import { SessionSecurity } from './sessionSecurity';
import { SecurityContext, SecurityHeaders, SanitizedError, SessionDetails } from './types';
import { TokenError, CSRFError, SessionError } from './errors';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
export class SecurityUtils {
    private static instance: SecurityUtils;
    private securityContext: SecurityContext;
    private tokenManager: TokenManager;
    private sessionSecurity: SessionSecurity;
    private constructor() {
        this.tokenManager = TokenManager.getInstance();
        this.sessionSecurity = SessionSecurity.getInstance();
        this.securityContext = {
            headers: {},
            session: null,
            token: null,
            errors: []
        };
    }
    public static getInstance(): SecurityUtils {
        if (!SecurityUtils.instance) {
            SecurityUtils.instance = new SecurityUtils();
        }
        return SecurityUtils.instance;
    }
    public getSecurityHeaders(): SecurityHeaders {
        return {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        };
    }
    public sanitizeInput(input: string): string {
        if (!input)
            return '';
        return input
            .replace(/[<>"'&]/g, (match) => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                case '&': return '&amp;';
                default: return match;
            }
        })
            .replace(/[\u0000-\u001F]/g, '')
            .replace(/[\u007F-\u009F]/g, '');
    }
    public sanitizeOutput(output: string): string {
        if (!output)
            return '';
        return output
            .replace(/[<>"'&]/g, (match) => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                case '&': return '&amp;';
                default: return match;
            }
        })
            .replace(/[\u0000-\u001F]/g, '')
            .replace(/[\u007F-\u009F]/g, '');
    }
    public sanitizeError(error: Error): SanitizedError {
        return {
            message: 'An error occurred',
            code: (error as any).code || 'UNKNOWN',
            type: error.name || 'Error'
        };
    }
    public sanitizeResponse<T>(response: AxiosResponse<T>): AxiosResponse<T> {
        if (response.data && typeof response.data === 'string') {
            response.data = this.sanitizeOutput(response.data) as unknown as T;
        }
        return response;
    }
    public getCSRFToken(): string | null {
        return localStorage.getItem('csrfToken');
    }
    public validateRequest(config: AxiosRequestConfig): boolean {
        try {
            // Validate CSRF token
            const csrfToken = this.getCSRFToken();
            if (!csrfToken) {
                throw new CSRFError('CSRF token is missing');
            }
            // Validate session
            if (!this.sessionSecurity.hasValidSession()) {
                throw new SessionError('Session is invalid');
            }
            // Validate token if present
            if (config.headers?.Authorization) {
                const token = config.headers.Authorization.replace('Bearer ', '');
                if (!this.tokenManager.hasValidToken()) {
                    throw new TokenError('Invalid token');
                }
            }
            return true;
        }
        catch (error) {
            console.error('Request validation failed:', error);
            return false;
        }
    }
    public async performSecurityAudit(): Promise<{
        success: boolean;
        details: string[];
    }> {
        const details: string[] = [];
        // Validate session and token
        if (!this.sessionSecurity.isSessionValid()) {
            details.push('Invalid session');
        }
        if (!this.tokenManager.hasValidToken()) {
            details.push('Invalid token');
        }
        // Validate security headers
        const headers = this.getSecurityHeaders();
        Object.entries(headers).forEach(([header, value]) => {
            if (!value) {
                details.push(`Missing header: ${header}`);
            }
        });
        return { success: details.length === 0, details };
    }
    public auditSecurity(): void {
        // Check security headers
        const headers = this.getSecurityHeaders();
        Object.entries(headers).forEach(([header, value]) => {
            if (!value) {
                console.warn(`Missing security header: ${header}`);
            }
        });
        // Check session security
        if (!this.sessionSecurity.isSessionValid()) {
            console.warn('Invalid session detected');
        }
        // Check token validity
        if (!this.tokenManager.hasValidToken()) {
            console.warn('Invalid token detected');
        }
    }
    // Security Context
    public getSecurityContext(): SessionDetails {
        return {
            sessionId: this.sessionSecurity.getSessionId(),
            userId: this.sessionSecurity.getUserId(),
            userAgent: this.sessionSecurity.getUserAgent(),
            ip: this.sessionSecurity.getIp(),
            sessionAge: this.sessionSecurity.getSessionAge(),
            sessionTimeout: this.sessionSecurity.getSessionTimeoutRemaining()
        };
    }
    public reportSecurityContext(context: SessionDetails): void {
        try {
            console.log('Security context report', context);
        }
        catch (error) {
            console.error('Failed to report security context', error);
        }
    }
}
