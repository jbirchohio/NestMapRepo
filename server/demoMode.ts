/**
 * Demo Mode Configuration and Control
 * Enterprise-ready feature flag system for demo data management
 */

export interface DemoModeConfig {
  enabled: boolean;
  sessionDurationMinutes: number;
  maxActivitiesPerDemo: number;
  maxTripsPerDemo: number;
  restrictedOperations: string[];
  allowedDemoUserIds: string[];
}

/**
 * Demo mode configuration based on environment
 */
export const demoModeConfig: DemoModeConfig = {
  // Enable demo mode via environment variable (default: false for production)
  enabled: process.env.ENABLE_DEMO_MODE === 'true',
  
  // Demo session duration in minutes
  sessionDurationMinutes: parseInt(process.env.DEMO_SESSION_DURATION || '30'),
  
  // Limits for demo users
  maxActivitiesPerDemo: parseInt(process.env.DEMO_MAX_ACTIVITIES || '10'),
  maxTripsPerDemo: parseInt(process.env.DEMO_MAX_TRIPS || '5'),
  
  // Operations restricted in demo mode
  restrictedOperations: [
    'DELETE /api/trips',
    'PUT /api/trips',
    'DELETE /api/activities', 
    'POST /api/users',
    'PUT /api/users',
    'DELETE /api/users',
    'POST /api/invitations',
    'POST /api/organizations',
    'PUT /api/organizations'
  ],
  
  // Demo user ID patterns that should receive demo data
  allowedDemoUserIds: ['demo-corp-1', 'demo-agency-1', 'demo-personal-1']
};

/**
 * Check if current environment should show demo data
 */
export function isDemoModeEnabled(): boolean {
  return demoModeConfig.enabled;
}

/**
 * Check if a user ID is a demo user
 */
export function isDemoUser(userId: string | number): boolean {
  const userIdStr = String(userId);
  return userIdStr.startsWith('demo-') || 
         demoModeConfig.allowedDemoUserIds.includes(userIdStr);
}

/**
 * Check if an operation is restricted in demo mode
 */
export function isOperationRestricted(method: string, path: string): boolean {
  if (!isDemoModeEnabled()) return false;
  
  const operation = `${method} ${path}`;
  return demoModeConfig.restrictedOperations.some(restricted => 
    operation.includes(restricted)
  );
}

/**
 * Get demo mode status for a session
 */
export function getDemoStatus(session: any): {
  isDemo: boolean;
  timeRemaining?: number;
  expired?: boolean;
} {
  if (!session?.isDemo) {
    return { isDemo: false };
  }
  
  const now = Date.now();
  const elapsed = Math.floor((now - session.demoStartTime) / 1000);
  const remaining = demoModeConfig.sessionDurationMinutes * 60 - elapsed;
  
  return {
    isDemo: true,
    timeRemaining: Math.max(0, remaining),
    expired: remaining <= 0
  };
}

/**
 * Log demo mode actions for analytics
 */
export function logDemoAction(action: string, userId: string, details?: any): void {
  if (!isDemoModeEnabled()) return;
  
  console.log('DEMO_ACTION:', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
}