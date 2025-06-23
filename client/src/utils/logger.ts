type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogContext {
    userId?: number;
    organizationId?: number;
    action?: string;
    component?: string;
    metadata?: Record<string, any>;
}
class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';
    private isProduction = process.env.NODE_ENV === 'production';
    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }
    debug(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }
    info(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.info(this.formatMessage('info', message, context));
        }
        // In production, send to logging service
        if (this.isProduction) {
            this.sendToLoggingService('info', message, context);
        }
    }
    warn(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.warn(this.formatMessage('warn', message, context));
        }
        if (this.isProduction) {
            this.sendToLoggingService('warn', message, context);
        }
    }
    error(message: string, error?: Error, context?: LogContext): void {
        const errorContext = {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined
        };
        if (this.isDevelopment) {
            console.error(this.formatMessage('error', message, errorContext));
            if (error)
                console.error(error);
        }
        // Always log errors in production
        if (this.isProduction) {
            this.sendToLoggingService('error', message, errorContext);
        }
    }
    // Performance logging for API requests
    apiRequest(method: string, url: string, data?: any): void {
        this.debug(`API Request: ${method} ${url}`, {
            method,
            url,
            hasData: !!data,
            component: 'api-client'
        });
    }
    apiResponse(method: string, url: string, status: number, duration?: number): void {
        const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
        const message = `API Response: ${method} ${url} - ${status}`;
        if (level === 'error') {
            this.error(message, undefined, { method, url, status, duration });
        }
        else if (level === 'warn') {
            this.warn(message, { method, url, status, duration });
        }
        else {
            this.debug(message, { method, url, status, duration });
        }
    }
    // Component lifecycle logging
    componentMount(componentName: string, props?: any): void {
        this.debug(`Component mounted: ${componentName}`, {
            component: componentName,
            action: 'mount',
            hasProps: !!props
        });
    }
    componentUnmount(componentName: string): void {
        this.debug(`Component unmounted: ${componentName}`, {
            component: componentName,
            action: 'unmount'
        });
    }
    // User action logging
    userAction(action: string, details?: any, userId?: number): void {
        this.info(`User action: ${action}`, {
            userId,
            action,
            details,
            component: 'user-interaction'
        });
    }
    // Business logic logging
    businessEvent(event: string, data?: any, organizationId?: number): void {
        this.info(`Business event: ${event}`, {
            organizationId,
            event,
            data,
            component: 'business-logic'
        });
    }
    private sendToLoggingService(level: LogLevel, message: string, context?: LogContext): void {
        // In production, this would send to a logging service like:
        // - DataDog
        // - LogRocket  
        // - Sentry
        // - CloudWatch
        // For now, we'll use a placeholder
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            environment: 'production',
            service: 'nestmap-frontend'
        };
        // Placeholder for production logging service
        // Example: fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) });
        console.log('Production log entry:', logEntry);
    }
}
export const logger = new Logger();
// Convenience functions for common logging patterns
export const logApiCall = (method: string, url: string, data?: any) => {
    logger.apiRequest(method, url, data);
};
export const logApiResponse = (method: string, url: string, status: number, duration?: number) => {
    logger.apiResponse(method, url, status, duration);
};
export const logError = (message: string, error?: Error, context?: LogContext) => {
    logger.error(message, error, context);
};
export const logUserAction = (action: string, details?: any, userId?: number) => {
    logger.userAction(action, details, userId);
};
export const logBusinessEvent = (event: string, data?: any, organizationId?: number) => {
    logger.businessEvent(event, data, organizationId);
};
