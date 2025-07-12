import { Request, Response, NextFunction } from 'express';
import { db } from '../db-connection.js';
import { userSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// In-memory session tracking as fallback until database is updated
const activeSessions = new Map<string, {
  userId: number;
  organizationId: number;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}>();

export async function trackUserActivity(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.id) {
    const sessionKey = `${req.user.id}_${req.ip}`;
    
    // Update in-memory session tracking
    activeSessions.set(sessionKey, {
      userId: req.user.id,
      organizationId: req.user.organizationId || '0',
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
    if (session.organizationId === organizationId && session.lastActivity > cutoff) {
      uniqueUsers.add(session.userId);
    }
  }
  
  return uniqueUsers.size;
}

export function getActiveSessions(organizationId: number) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sessions = [];
  
  for (const session of activeSessions.values()) {
    if (session.organizationId === organizationId && session.lastActivity > cutoff) {
      sessions.push(session);
    }
  }
  
  return sessions;
}