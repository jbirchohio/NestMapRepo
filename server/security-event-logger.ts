import type { SecurityEvent } from './types/security-events';

/**
 * Logs security events to the console and could be extended to log to a monitoring service
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // In a production environment, this would send events to a monitoring service
    console.log('[SECURITY_EVENT]', JSON.stringify(event, null, 2));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Helper function to create security events with common fields
 */
export function createSecurityEvent(
  event: string, 
  userId: string, 
  organizationId?: string, 
  role?: string, 
  metadata?: Record<string, any>
): SecurityEvent {
  return {
    event,
    user_id: userId,
    organizationId,
    role,
    timestamp: new Date().toISOString(),
    metadata
  };
}
