import { TokenManager } from './tokenManager.ts';
import { SecureCookie } from './SecureCookie.ts';
import { handleError, SessionError } from './errorHandler.ts';
interface SessionState {
    sessionId: string;
    userId: string;
    createdAt: number;
    lastActivity: number;
    userAgent: string;
    ip: string;
}
// Constants
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
export class SessionSecurity {
    private static instance: SessionSecurity;
    private sessionId: string | null = null;
    private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
    private lastActivity: number = Date.now();
    private inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    private sessionRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
    private userId: string | null = null;
    private userAgent: string | null = null;
    private ip: string | null = null;
    private sessionState: {
        sessionId: string | null;
        userId: string | null;
        createdAt: number;
        lastActivity: number;
        userAgent: string | null;
        ip: string | null;
    } | null = null;
    private constructor() {
        this.loadSession();
        this.startInactivityMonitor();
    }
    public static getInstance(): SessionSecurity {
        if (!SessionSecurity.instance) {
            SessionSecurity.instance = new SessionSecurity();
        }
        return SessionSecurity.instance;
    }
    private loadSession(): void {
        try {
            const storedSession = SecureCookie.get('session_state');
            if (storedSession) {
                this.sessionState = JSON.parse(storedSession);
                this.sessionId = this.sessionState.sessionId;
                this.lastActivity = this.sessionState.lastActivity;
                this.userId = this.sessionState.userId;
                this.userAgent = this.sessionState.userAgent;
                this.ip = this.sessionState.ip;
            }
        }
        catch (error) {
            handleError(error);
        }
    }
    public hasValidSession(): boolean {
        if (!this.sessionId)
            return false;
        const now = Date.now();
        const lastActivity = this.sessionState?.lastActivity || this.lastActivity;
        return now - lastActivity <= this.sessionTimeout;
    }
    public getSessionId(): string | null {
        return this.sessionId;
    }
    public getUserId(): string | null {
        return this.userId;
    }
    public getUserAgent(): string | null {
        return this.userAgent;
    }
    public getIp(): string | null {
        return this.ip;
    }
    public getSessionAge(): number {
        return Date.now() - (this.sessionState?.createdAt || this.lastActivity);
    }
    public getSessionTimeoutRemaining(): number {
        return this.sessionTimeout - (Date.now() - this.lastActivity);
    }
    public updateActivity(): void {
        this.lastActivity = Date.now();
        if (this.sessionState) {
            this.sessionState.lastActivity = this.lastActivity;
        }
        this.storeSession();
    }
    private startSessionRefresh(): void {
        if (this.sessionRefreshTimeout) {
            clearTimeout(this.sessionRefreshTimeout);
        }
        this.sessionRefreshTimeout = setTimeout(() => {
            if (this.sessionState) {
                this.sessionState.lastActivity = Date.now();
                this.storeSession();
            }
        }, SESSION_REFRESH_INTERVAL);
    }
    public setSession(sessionData: {
        sessionId: string;
        userId: string;
        userAgent: string;
        ip: string;
    }): void {
        this.sessionId = sessionData.sessionId;
        this.userId = sessionData.userId;
        this.userAgent = sessionData.userAgent;
        this.ip = sessionData.ip;
        this.lastActivity = Date.now();
        this.sessionState = {
            ...sessionData,
            createdAt: this.lastActivity,
            lastActivity: this.lastActivity
        };
        this.storeSession();
        this.startSessionRefresh();
    }
    public destroySession(): void {
        if (this.sessionRefreshTimeout) {
            clearTimeout(this.sessionRefreshTimeout);
        }
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }
        this.sessionId = null;
        this.sessionState = null;
        SecureCookie.remove('session_state');
    }
    private storeSession(): void {
        if (this.sessionState) {
            try {
                SecureCookie.set('session_state', JSON.stringify(this.sessionState), {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: SESSION_TIMEOUT / 1000
                });
            }
            catch (error) {
                handleError(error);
            }
        }
    }
    private startInactivityMonitor(): void {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }
        this.inactivityTimeout = setTimeout(() => {
            if (this.sessionState) {
                this.destroySession();
            }
        }, SESSION_TIMEOUT);
    }
    public static getSessionSecurity(): SessionSecurity {
        return SessionSecurity.getInstance();
    }
    public isSessionValid(): boolean {
        return this.hasValidSession();
    }
    public rotateSession(): void {
        if (this.sessionState) {
            this.sessionId = crypto.randomUUID();
            this.sessionState.sessionId = this.sessionId;
            this.sessionState.lastActivity = Date.now();
            this.storeSession();
            this.startSessionRefresh();
        }
    }
    public async handleSessionError(error: unknown): Promise<void> {
        const err = error instanceof Error ? error : new SessionError(String(error));
        handleError(err);
        try {
            TokenManager.getInstance().destroyTokens();
        }
        catch (tmError) {
            console.error('TokenManager not initialized', tmError);
        }
        this.destroySession();
    }
    public clearSession(): void {
        this.sessionId = null;
        this.sessionState = null;
        SecureCookie.remove('session_state');
    }
    public getSessionInfo(): {
        sessionId: string | null;
        userId: string | null;
        age: number;
        timeoutRemaining: number;
        isValid: boolean;
    } {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            age: this.getSessionAge(),
            timeoutRemaining: this.getSessionTimeoutRemaining(),
            isValid: this.isSessionValid()
        };
    }
}
