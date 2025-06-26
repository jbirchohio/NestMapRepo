import { AxiosError } from 'axios';
import { SecurityUtils } from './securityUtils';
import { TokenManager } from './tokenManager';
import { SessionSecurity } from './sessionSecurity';
import { SecureCookie } from './SecureCookie';
import apiClient from '../services/api/apiClient';
export interface ErrorLog {
    timestamp: string;
    errorType: string;
    errorMessage: string;
    stackTrace: string | null;
    userId: string | null;
    sessionId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    context: Record<string, any>;
}
export class ErrorLogger {
    private static instance: ErrorLogger;
    private securityUtils: SecurityUtils;
    private tokenManager: TokenManager;
    private sessionSecurity: SessionSecurity;
    private errorLogs: ErrorLog[];
    private maxLogs: number;
    private logInterval: NodeJS.Timeout | null;
    private isProcessing: boolean;
    private pendingLogs: ErrorLog[];
    private constructor() {
        // Initialize all properties with default values
        this.securityUtils = SecurityUtils.getInstance();
        this.tokenManager = TokenManager.getInstance();
        this.sessionSecurity = SessionSecurity.getInstance();
        this.errorLogs = [];
        this.maxLogs = 100; // Maximum logs to keep in memory
        this.logInterval = null;
        this.isProcessing = false;
        this.pendingLogs = [];
        
        // Set up log rotation
        this.setupLogRotation();
    }
    public static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }
    private setupLogRotation(): void {
        // Rotate logs every 5 minutes
        this.logInterval = setInterval(() => {
            this.rotateLogs();
        }, 5 * 60 * 1000);
    }
    private rotateLogs(): void {
        if (this.errorLogs.length > this.maxLogs) {
            this.errorLogs = this.errorLogs.slice(-this.maxLogs);
        }
    }
    private getSecurityContext(): Record<string, any> {
        return {
            userId: this.sessionSecurity.getUserId(),
            sessionId: this.sessionSecurity.getSessionId(),
            ipAddress: this.sessionSecurity.getIp(),
            userAgent: this.sessionSecurity.getUserAgent()
        };
    }
    private sanitizeError(error: Error): Error {
        const sanitizedError = new Error(this.securityUtils.sanitizeOutput(error.message));
        sanitizedError.name = this.securityUtils.sanitizeOutput(error.name);
        return sanitizedError;
    }
    public logError(error: Error | AxiosError, context: Record<string, any> = {}): void {
        try {
            const sanitizedError = error instanceof Error
                ? this.sanitizeError(error)
                : new Error(this.securityUtils.sanitizeOutput(error as any));
            const errorLog: ErrorLog = {
                timestamp: new Date().toISOString(),
                errorType: error.name || 'Error',
                errorMessage: sanitizedError.message,
                stackTrace: error.stack || null,
                userId: this.sessionSecurity.getUserId(),
                sessionId: this.sessionSecurity.getSessionId(),
                ipAddress: this.sessionSecurity.getIp(),
                userAgent: this.sessionSecurity.getUserAgent(),
                context: {
                    ...context,
                    ...this.getSecurityContext()
                }
            };
            this.errorLogs.push(errorLog);
            this.rotateLogs();
            // Send to backend if token is valid
            if (this.tokenManager.hasValidToken()) {
                this.sendErrorToBackend(errorLog);
            }
            //  in secure cookie for offline access
            this.ErrorLocally(errorLog);
        }
        catch (error) {
            console.error('Failed to log error:', error);
        }
    }
    private async sendErrorToBackend(errorLog: ErrorLog): Promise<void> {
        try {
            await apiClient.post('/errors', errorLog);
        }
        catch (error) {
            //  failed logs for retry
            SecureCookie.set('pending_errors', JSON.stringify(this.errorLogs), {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 86400 // 24 hours
            });
        }
    }
    private ErrorLocally(errorLog: ErrorLog): void {
        try {
            const dLogs = SecureCookie.get('error_logs') || '[]';
            const logs = JSON.parse(dLogs);
            logs.push(errorLog);
            SecureCookie.set('error_logs', JSON.stringify(logs), {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 86400 // 24 hours
            });
        }
        catch (error) {
            console.error('Failed to  error locally:', error);
        }
    }
    public getRecentErrors(limit: number = 10): ErrorLog[] {
        return this.errorLogs.slice(-limit);
    }
    public clearLogs(): void {
        this.errorLogs = [];
        SecureCookie.remove('error_logs');
    }
    public destroy(): void {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    }
    public retryFailedLogs(): void {
        try {
            const pendingLogs = SecureCookie.get('pending_errors');
            if (pendingLogs) {
                const logs = JSON.parse(pendingLogs);
                for (const log of logs) {
                    this.sendErrorToBackend(log);
                }
                SecureCookie.remove('pending_errors');
            }
        }
        catch (error) {
            console.error('Failed to retry error logs:', error);
        }
    }
}
