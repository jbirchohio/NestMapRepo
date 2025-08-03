import { Request, Response, NextFunction } from 'express';
import { db } from '../db-connection';
import { userSessions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// In-memory session tracking as fallback until database is updated
const activeSessions = new Map<string, {
  user_id: number;
  organization_id: number;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}>();

export async function trackUserActivity(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.id) {
    const sessionKey = `${req.user.id}_${req.ip}`;
    
    // Update in-memory session tracking
    activeSessions.set(sessionKey, {
      user_id: req.user.id,
      organization_id: req.user.organization_id || 0,
      lastActivity: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    // Clean up old sessions (older than 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [key, session] of activeSessions.entries()) {
      if (session.lastActivity < cutoff) {
        activeSessions.delete(key);
      }
    }
  }
  
  next();
}

export function getActiveUserCount(organizationId: number): number {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const uniqueUsers = new Set<number>();
  
  for (const [key, session] of activeSessions.entries()) {
    if (session.organization_id === organizationId && session.lastActivity > cutoff) {
      uniqueUsers.add(session.user_id);
    }
  }
  
  return uniqueUsers.size;
}

export function getActiveSessions(organizationId: number) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sessions = [];
  
  for (const session of activeSessions.values()) {
    if (session.organization_id === organizationId && session.lastActivity > cutoff) {
      sessions.push(session);
    }
  }
  
  return sessions;
}