import * as Sentry from "@sentry/node";

/**
 * Production Monitoring Service - Sentry Integration
 * Error tracking and performance monitoring for enterprise readiness
 */

export function initializeMonitoring() {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        // Enable automatic instrumentation
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        Sentry.postgresIntegration(),
      ],
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Additional configuration
      beforeSend: (event) => {
        // Filter out sensitive information
        if (event.request?.data) {
          const data = event.request.data as Record<string, any>;
          if (typeof data === 'object' && data !== null) {
            // Remove sensitive fields
            delete data.password;
            delete data.auth_token;
            delete data.api_key;
          }
        }
        return event;
      }
    });
    
    console.log('✅ Sentry monitoring initialized');
  } else {
    console.log('⚠️ SENTRY_DSN not found - monitoring disabled');
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Application Error:', error);
  
  if (context) {
    Sentry.setContext('error_context', context);
  }
  
  Sentry.captureException(error);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}] ${message}`);
  Sentry.captureMessage(message, level);
}

export function setUserContext(user: { id: number; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id.toString(),
    email: user.email,
    role: user.role
  });
}

export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000
  });
}

export function measurePerformance<T>(name: string, fn: () => T): T {
  const span = Sentry.startSpan({ name }, () => fn());
  return span;
}

// Export Sentry for Express middleware
export { Sentry };