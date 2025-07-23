export interface SecurityEvent {
  event: string;
  user_id: string;
  organizationId?: string;
  role?: string;
  endpoint?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
