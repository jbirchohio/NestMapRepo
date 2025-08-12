import { Request, Response, NextFunction } from 'express';
import { db } from '../db-connection';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Super admin (founder) - has full access including financials
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'jbirch33@gmail.com';

// Additional admin emails - can be added via database
const ADDITIONAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

// Middleware to check if user is admin
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;

    // Get user from database
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check admin status
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const isAdmin = isSuperAdmin ||
                   user.role === 'admin' ||
                   ADDITIONAL_ADMIN_EMAILS.includes(user.email);

    if (!isAdmin) {
      logger.warn(`Non-admin user ${user.email} attempted to access admin route`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Add admin info to request
    (req as any).isAdmin = true;
    (req as any).isSuperAdmin = isSuperAdmin;

    // User is admin, proceed
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(500).json({ message: 'Authorization failed' });
  }
};

// Helper to check if user is admin (for non-middleware use)
export const isUserAdmin = async (userId: number): Promise<boolean> => {
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return false;

    const ADMIN_EMAILS = [SUPER_ADMIN_EMAIL, ...ADDITIONAL_ADMIN_EMAILS];
    return user.role === 'admin' || ADMIN_EMAILS.includes(user.email);
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
};

// Function to make a user an admin
export const makeUserAdmin = async (email: string): Promise<boolean> => {
  try {
    const result = await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email));

    logger.info(`User ${email} granted admin privileges`);
    return true;
  } catch (error) {
    logger.error('Error making user admin:', error);
    return false;
  }
};