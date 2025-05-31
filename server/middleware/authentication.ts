import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Enhanced authentication middleware with MFA support
 */
export interface AuthSession {
  userId: number;
  organizationId: number | null;
  role: string;
  mfaVerified: boolean;
  sessionId: string;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Session store for tracking active sessions
 */
class SessionStore {
  private sessions = new Map<string, AuthSession>();
  private userSessions = new Map<number, Set<string>>();

  createSession(userId: number, organizationId: number | null, role: string, req: Request): string {
    const sessionId = crypto.randomUUID();
    
    const session: AuthSession = {
      userId,
      organizationId,
      role,
      mfaVerified: false,
      sessionId,
      lastActivity: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    };

    this.sessions.set(sessionId, session);
    
    // Track user sessions for multi-device management
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    return sessionId;
  }

  getSession(sessionId: string): AuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  invalidateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    return true;
  }

  invalidateUserSessions(userId: number): number {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) return 0;

    let count = 0;
    for (const sessionId of userSessions) {
      if (this.sessions.delete(sessionId)) {
        count++;
      }
    }
    
    this.userSessions.delete(userId);
    return count;
  }

  cleanupExpiredSessions(): number {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.invalidateSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getUserSessionsCount(userId: number): number {
    return this.userSessions.get(userId)?.size || 0;
  }
}

const sessionStore = new SessionStore();

// Clean up expired sessions every hour
setInterval(() => {
  const cleaned = sessionStore.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000);

/**
 * Enhanced session validation middleware
 */
export function validateSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string || req.session?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ message: 'No session found' });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ message: 'Invalid session' });
  }

  // Check for session hijacking
  if (session.ipAddress !== (req.ip || 'unknown')) {
    console.warn('Potential session hijacking detected:', {
      sessionId,
      originalIp: session.ipAddress,
      currentIp: req.ip,
      userId: session.userId
    });
    
    sessionStore.invalidateSession(sessionId);
    return res.status(401).json({ message: 'Session security violation' });
  }

  // Update last activity
  sessionStore.updateSessionActivity(sessionId);

  // Attach session info to request
  req.authSession = session;
  req.user = {
    id: session.userId,
    organization_id: session.organizationId,
    role: session.role
  };

  next();
}

/**
 * MFA requirement middleware
 */
export function requireMFA(req: Request, res: Response, next: NextFunction) {
  if (!req.authSession?.mfaVerified) {
    return res.status(403).json({ 
      message: 'MFA verification required',
      requiresMFA: true 
    });
  }
  next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authSession) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.authSession.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.authSession.role
      });
    }

    next();
  };
}

/**
 * Organization access control middleware
 */
export function requireOrganization(req: Request, res: Response, next: NextFunction) {
  if (!req.authSession?.organizationId) {
    return res.status(403).json({ 
      message: 'Organization membership required' 
    });
  }
  next();
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Password must be at least 8 characters long');

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  // Common patterns to avoid
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score -= 2;
    feedback.push('Avoid common passwords and patterns');
  }

  return {
    isValid: score >= 4 && feedback.length === 0,
    score: Math.max(0, Math.min(5, score)),
    feedback
  };
}

/**
 * Account lockout protection
 */
class AccountLockout {
  private attempts = new Map<string, { count: number; lockedUntil?: Date }>();
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  recordFailedAttempt(identifier: string): boolean {
    const key = identifier.toLowerCase();
    const current = this.attempts.get(key) || { count: 0 };
    
    current.count++;
    
    if (current.count >= this.maxAttempts) {
      current.lockedUntil = new Date(Date.now() + this.lockoutDuration);
      console.warn('Account locked due to failed attempts:', { identifier: key });
    }
    
    this.attempts.set(key, current);
    return current.count >= this.maxAttempts;
  }

  isLocked(identifier: string): boolean {
    const key = identifier.toLowerCase();
    const record = this.attempts.get(key);
    
    if (!record?.lockedUntil) return false;
    
    if (new Date() > record.lockedUntil) {
      this.attempts.delete(key);
      return false;
    }
    
    return true;
  }

  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier.toLowerCase());
  }

  getAttempts(identifier: string): number {
    return this.attempts.get(identifier.toLowerCase())?.count || 0;
  }
}

export const accountLockout = new AccountLockout();

/**
 * Brute force protection middleware
 */
export function protectBruteForce(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body.email || req.body.username || req.ip;
  
  if (accountLockout.isLocked(identifier)) {
    return res.status(429).json({
      message: 'Account temporarily locked due to too many failed attempts',
      locked: true
    });
  }
  
  // Add identifier to request for use in auth failure handling
  req.authIdentifier = identifier;
  next();
}

export { sessionStore };