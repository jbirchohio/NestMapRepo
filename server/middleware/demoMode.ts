import { Request, Response, NextFunction } from 'express';
import { isDemoModeEnabled, isDemoUser, isOperationRestricted, logDemoAction } from '../demoMode';

// Extend Request to include demo status
declare global {
  namespace Express {
    interface Request {
      isDemo?: boolean;
      demoUserId?: string;
    }
  }
}

/**
 * Middleware to enforce demo mode restrictions
 */
export function demoModeMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if demo mode is enabled globally
  if (!isDemoModeEnabled()) {
    return next();
  }

  // Check if this is a demo user (by auth or special header)
  const demoHeader = req.headers['x-demo-mode'] === 'true';
  const userId = req.user?.id || req.headers['x-demo-user-id'];
  const userEmail = req.user?.email;
  const username = req.user?.username;
  
  // Check by email domain (.demo) or username prefix (demo-)
  const isDemoByEmail = userEmail && userEmail.includes('.demo');
  const isDemoByUsername = username && username.startsWith('demo-');
  
  if (demoHeader || isDemoByEmail || isDemoByUsername || (userId && isDemoUser(userId))) {
    req.isDemo = true;
    req.demoUserId = String(userId || 'demo-anonymous');
    
    // Log the action
    logDemoAction(
      `${req.method} ${req.path}`,
      req.demoUserId,
      { 
        body: req.body,
        query: req.query,
        ip: req.ip 
      }
    );

    // Check if this operation is restricted
    if (isOperationRestricted(req.method, req.path)) {
      return res.status(403).json({
        error: 'Operation not allowed in demo mode',
        message: 'This action is restricted in the demo environment. In production, you would have full access.',
        demoMode: true
      });
    }

    // Add demo mode headers to response
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Restrictions', 'read-only');
  }

  next();
}

/**
 * Middleware to add demo banner data to all responses
 */
export function demoBannerMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.isDemo) {
    // Override res.json to inject demo banner
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (typeof data === 'object' && !Array.isArray(data)) {
        data._demo = {
          mode: true,
          message: 'This is demo data. Changes will be reset every 30 minutes.',
          restrictions: [
            'Cannot delete core demo data',
            'Cannot modify organization settings',
            'Cannot invite real users',
            'Limited to 10 trips and 50 activities'
          ],
          resetIn: Math.floor((30 * 60 * 1000 - (Date.now() % (30 * 60 * 1000))) / 1000) // seconds until next reset
        };
      }
      return originalJson(data);
    };
  }
  next();
}

/**
 * Middleware to limit demo data creation
 */
export async function demoLimitsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.isDemo || req.method !== 'POST') {
    return next();
  }

  // Check limits based on path
  if (req.path.includes('/trips')) {
    // Check trip count for demo user
    const { db } = await import('../db');
    const { trips } = await import('@shared/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    
    const [count] = await db.select({ 
      count: sql<number>`count(*)` 
    })
    .from(trips)
    .where(and(
      eq(trips.user_id, req.user?.id || 0),
      sql`created_at > NOW() - INTERVAL '30 minutes'`
    ));

    if (count.count >= 10) {
      return res.status(429).json({
        error: 'Demo limit reached',
        message: 'Demo users are limited to 10 trips. Please explore the existing trips or wait for the next reset.',
        demoMode: true,
        limit: 10,
        current: count.count
      });
    }
  }

  if (req.path.includes('/activities')) {
    // Similar check for activities
    const { db } = await import('../db');
    const { activities } = await import('@shared/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    
    const [count] = await db.select({ 
      count: sql<number>`count(*)` 
    })
    .from(activities)
    .where(and(
      eq(activities.created_by, req.user?.id || 0),
      sql`created_at > NOW() - INTERVAL '30 minutes'`
    ));

    if (count.count >= 50) {
      return res.status(429).json({
        error: 'Demo limit reached',
        message: 'Demo users are limited to 50 activities. Please explore the existing activities or wait for the next reset.',
        demoMode: true,
        limit: 50,
        current: count.count
      });
    }
  }

  next();
}