import { AxiosError } from 'axios';
import { jwtAuth } from '@/lib/jwtAuth';
import { getApiClient } from '@/services/api/apiClient';

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
  private errorLogs: ErrorLog[];
  private maxLogs: number;
  private logInterval: NodeJS.Timeout | null;

  private constructor() {
    this.errorLogs = [];
    this.maxLogs = 100; // Maximum logs to keep in memory
    this.logInterval = null;
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

  private async getSecurityContext(): Promise<Record<string, any>> {
    const user = jwtAuth.getUser();
    const token = jwtAuth.getToken();
    return {
      userId: user?.id || null,
      sessionId: token ? 'active' : null,
      ipAddress: null, // No longer tracking IP in client
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    };
  }

  private sanitizeError(error: Error): Error {
    // Simple sanitization without dependency on securityUtils
    const sanitizedError = new Error(error.message.replace(/[<>]/g, ''));
    sanitizedError.name = error.name.replace(/[<>]/g, '');
    return sanitizedError;
  }

  public async logError(
    error: Error | AxiosError,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      const sanitizedError = error instanceof Error 
        ? this.sanitizeError(error)
        : new Error((error as any).message || 'Unknown error');

      const securityContext = await this.getSecurityContext();
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        errorType: error.name || 'Error',
        errorMessage: sanitizedError.message,
        stackTrace: error.stack || null,
        userId: securityContext.userId,
        sessionId: securityContext.sessionId,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        context: {
          ...context,
          ...securityContext
        }
      };

      this.errorLogs.push(errorLog);
      this.rotateLogs();

      // Send to backend if authenticated
      const token = jwtAuth.getToken();
      if (token) {
        this.sendErrorToBackend(errorLog);
      }

      // Store in local storage for offline access
      this.storeErrorLocally(errorLog);
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  private async sendErrorToBackend(errorLog: ErrorLog): Promise<void> {
    try {
      await getApiClient().post('/errors', errorLog);
    } catch (error) {
      //  failed logs for retry
      localStorage.setItem('pending_errors', JSON.stringify(this.errorLogs));
    }
  }

  private storeErrorLocally(errorLog: ErrorLog): void {
    try {
      const dLogs = localStorage.getItem('error_logs') || '[]';
      const logs = JSON.parse(dLogs);
      logs.push(errorLog);
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to  error locally:', error);
    }
  }

  public getRecentErrors(limit: number = 10): ErrorLog[] {
    return this.errorLogs.slice(-limit);
  }

  public clearLogs(): void {
    this.errorLogs = [];
    localStorage.removeItem('error_logs');
  }

  public destroy(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }

  public retryFailedLogs(): void {
    try {
      const pendingLogs = localStorage.getItem('pending_errors');
      if (pendingLogs) {
        const logs = JSON.parse(pendingLogs);
        for (const log of logs) {
          this.sendErrorToBackend(log);
        }
        localStorage.removeItem('pending_errors');
      }
    } catch (error) {
      console.error('Failed to retry error logs:', error);
    }
  }
}
