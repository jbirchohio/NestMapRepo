/**
 * Sentry Error Monitoring Service
 * Provides production-ready error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';

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
        // Node.js integrations
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        
        // Additional integrations
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration({
          mode: 'warn' // Just warn, don't crash
        }),
      ],

      beforeSend(event, hint) {
        // Filter out sensitive information
        if (event.exception) {
          const error = hint.originalException;
          
          // Don't send authentication errors to reduce noise
          if (error instanceof Error && error.message.includes('authentication')) {
            return null;
          }
          
          // Sanitize request data
          if (event.request) {
            // Remove sensitive headers
            if (event.request.headers) {
              delete event.request.headers['authorization'];
              delete event.request.headers['cookie'];
              delete event.request.headers['x-api-key'];
            }
            
            // Remove sensitive request data
            if (event.request.data) {
              const data = event.request.data as any;
              if (typeof data === 'object') {
                delete data.password;
                delete data.token;
                delete data.secret;
                delete data.apiKey;
              }
            }
          }
        }
        
        return event;
      }
    });

    this.initialized = true;
    console.log('✅ Sentry error monitoring initialized');
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: Record<string, any>): string | undefined {
    if (!this.initialized) return;

    return Sentry.captureException(error, {
      tags: {
        component: 'server',
        ...context?.tags
      },
      extra: context
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string | undefined {
    if (!this.initialized) return;

    return Sentry.captureMessage(message, {
      level: level,
      tags: {
        component: 'server',
        ...context?.tags
      },
      extra: context
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: {
    id?: string | number;
    email?: string;
    username?: string;
    organizationId?: number;
  }): void {
    if (!this.initialized) return;

    Sentry.setUser({
      id: user.id?.toString(),
      email: user.email,
      username: user.username,
      organization_id: user.organizationId?.toString()
    });
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.setContext(key, context);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, operation: string): any | undefined {
    if (!this.initialized) return;

    return Sentry.startSpan({
      name,
      op: operation
    }, () => {
      // Transaction context
    });
  }

  /**
   * Flush pending events (useful for serverless environments)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    return Sentry.close(timeout);
  }

  /**
   * Get Express request handler
   */
  getRequestHandler() {
    if (!this.initialized) {
      return (req: any, res: any, next: any) => next();
    }
    // Use middleware-style function for compatibility
    return (req: any, res: any, next: any) => {
      // Basic request tracking
      Sentry.addBreadcrumb({
        message: `${req.method} ${req.path}`,
        category: 'http',
        level: 'info'
      });
      next();
    };
  }

  /**
   * Get Express tracing handler
   */
  getTracingHandler() {
    if (!this.initialized) {
      return (req: any, res: any, next: any) => next();
    }
    // Simple pass-through for now
    return (req: any, res: any, next: any) => next();
  }

  /**
   * Get Express error handler
   */
  getErrorHandler() {
    if (!this.initialized) {
      return (error: any, req: any, res: any, next: any) => next(error);
    }
    // Custom error handler that works with Sentry v9
    return (error: any, req: any, res: any, next: any) => {
      this.captureException(error, {
        tags: {
          endpoint: req.path,
          method: req.method
        },
        extra: {
          body: req.body,
          query: req.query,
          params: req.params
        }
      });
      next(error);
    };
  }
}

// Export singleton instance
export const sentryService = new SentryService();

// Export Sentry for direct access if needed
export { Sentry };