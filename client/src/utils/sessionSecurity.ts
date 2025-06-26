import { TokenManager } from './tokenManager';
import { SecureCookie } from './SecureCookie';
import { handleError, SessionError } from './errorHandler';
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
    private static instance: SessionSecurity | null = null;
    private sessionId: string | null = null;
    private sessionTimeout: number;
    private lastActivity: number;
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
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
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
                const parsedSession = JSON.parse(storedSession);
                // Validate required fields
                if (parsedSession && 
                    'sessionId' in parsedSession && 
                    'lastActivity' in parsedSession) {
                    // Create a new session state object with validated properties
                    this.sessionState = {
                        sessionId: parsedSession.sessionId,
                        lastActivity: parsedSession.lastActivity,
                        userId: 'userId' in parsedSession ? parsedSession.userId : null,
                        userAgent: 'userAgent' in parsedSession ? parsedSession.userAgent : null,
                        ip: 'ip' in parsedSession ? parsedSession.ip : null,
                        createdAt: 'createdAt' in parsedSession && typeof parsedSession.createdAt === 'number' 
                            ? parsedSession.createdAt 
                            : Date.now()
                    };
                    // Update individual properties
                    this.sessionId = parsedSession.sessionId;
                    this.lastActivity = parsedSession.lastActivity;
                    this.userId = 'userId' in parsedSession ? parsedSession.userId : null;
                    this.userAgent = 'userAgent' in parsedSession ? parsedSession.userAgent : null;
                    this.ip = 'ip' in parsedSession ? parsedSession.ip : null;
                } else {
                    // Invalid session format, clear it
                    this.clearSession();
                }
            }
        } catch (error) {
            handleError(error instanceof Error ? error : new Error(String(error)));
            this.clearSession();
        }
    }
    public hasValidSession(): boolean {
        if (!this.sessionId || !this.sessionState) {
            return false;
        }
        const now = Date.now();
        const lastActivity = this.sessionState.lastActivity || this.lastActivity;
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
                handleError(error instanceof Error ? error : new Error(String(error)));
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
