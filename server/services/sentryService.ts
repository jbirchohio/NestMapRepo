/**
 * Sentry Error Monitoring Service
 * Provides production-ready error tracking and performance monitoring
 */

// Try to load Sentry, but make it optional
let Sentry: any = null;
let SentryLoaded = false;

try {
  Sentry = require('@sentry/node');
  SentryLoaded = true;
} catch (error) {
  console.log('ℹ️ @sentry/node not found - error monitoring disabled');
}

interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
}

class SentryService {
  private initialized = false;

  /**
   * Initialize Sentry with environment-specific configuration
   */
  init(config?: Partial<SentryConfig>): void {
    if (!SentryLoaded) {
      console.log('⚠️ Sentry not available - monitoring disabled');
      return;
    }

    const defaultConfig: SentryConfig = {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production'
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Don't initialize if no DSN is provided
    if (!finalConfig.dsn) {
      console.log('⚠️ Sentry DSN not provided, error monitoring disabled');
      return;
    }

    Sentry.init({
      dsn: finalConfig.dsn,
      environment: finalConfig.environment,
      release: finalConfig.release,
      sampleRate: finalConfig.sampleRate,
      tracesSampleRate: finalConfig.tracesSampleRate,
      profilesSampleRate: finalConfig.profilesSampleRate,
      debug: finalConfig.debug,
      integrations: [
        // Enable HTTP call tracing
        Sentry.httpIntegration(),
        // Express integration
        Sentry.expressIntegration(),
        // Handle uncaught exceptions
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration({
          mode: 'strict'
        })
      ],
      beforeSend: (event, hint) => {
        // Filter out sensitive data
        if (event.request) {
          // Remove auth headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          
          // Remove sensitive body data
          if (event.request.data && typeof event.request.data === 'object') {
            const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'credit_card'];
            sensitiveFields.forEach(field => {
              if (field in event.request.data) {
                event.request.data[field] = '[REDACTED]';
              }
            });
          }
        }

        // Log errors in development
        if (process.env.NODE_ENV !== 'production' && hint.originalException) {
          console.error('Sentry captured error:', hint.originalException);
        }

        return event;
      }
    });

    this.initialized = true;
    console.log('✅ Sentry error monitoring initialized');
  }

  /**
   * Capture an exception with additional context
   */
  captureException(error: Error, context?: Record<string, any>): string | undefined {
    if (!SentryLoaded || !this.initialized) {
      console.error('Error:', error);
      return undefined;
    }

    return Sentry.captureException(error, {
      contexts: {
        custom: context
      }
    });
  }

  /**
   * Capture a message with severity level
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): string | undefined {
    if (!SentryLoaded || !this.initialized) {
      console.log(`[${level.toUpperCase()}]`, message);
      return undefined;
    }

    return Sentry.captureMessage(message, {
      level: level as any,
      contexts: {
        custom: context
      }
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: {
    id: string | number;
    email?: string;
    username?: string;
    role?: string;
    organizationId?: number;
  }): void {
    if (!SentryLoaded || !this.initialized) return;

    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      organization_id: user.organizationId?.toString()
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!SentryLoaded || !this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Set additional context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!SentryLoaded || !this.initialized) return;
    Sentry.setContext(key, context);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    data?: Record<string, any>;
  }): void {
    if (!SentryLoaded || !this.initialized) return;

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Create a performance transaction
   */
  startTransaction(name: string, op: string): any {
    if (!SentryLoaded || !this.initialized) return null;

    return Sentry.startSpan({
      name,
      op
    });
  }

  /**
   * Flush all pending events
   */
  async flush(timeout?: number): Promise<boolean> {
    if (!SentryLoaded || !this.initialized) return true;
    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry client
   */
  async close(timeout?: number): Promise<boolean> {
    if (!SentryLoaded || !this.initialized) return true;
    return Sentry.close(timeout);
  }

  /**
   * Express middleware for request handling
   */
  getRequestHandler() {
    if (!SentryLoaded) {
      // Return a no-op middleware
      return (req: any, res: any, next: any) => next();
    }
    return Sentry.Handlers.requestHandler();
  }

  /**
   * Express middleware for error handling
   */
  getErrorHandler() {
    if (!SentryLoaded) {
      // Return a no-op middleware
      return (err: any, req: any, res: any, next: any) => next(err);
    }
    return Sentry.Handlers.errorHandler();
  }

  /**
   * Express middleware for tracing
   */
  getTracingHandler() {
    if (!SentryLoaded) {
      // Return a no-op middleware
      return (req: any, res: any, next: any) => next();
    }
    return Sentry.Handlers.tracingHandler();
  }

  /**
   * Performance monitoring for database queries
   */
  monitorDatabaseQuery(queryName: string, query: () => Promise<any>): Promise<any> {
    if (!SentryLoaded || !this.initialized) return query();

    return Sentry.startSpan({
      name: queryName,
      op: 'db.query'
    }, query);
  }

  /**
   * Monitor API endpoint performance
   */
  monitorApiEndpoint(endpoint: string, handler: () => Promise<any>): Promise<any> {
    if (!SentryLoaded || !this.initialized) return handler();

    return Sentry.startSpan({
      name: endpoint,
      op: 'http.server'
    }, handler);
  }
}

// Export singleton instance
export const sentryService = new SentryService();

// Initialize on import
sentryService.init();