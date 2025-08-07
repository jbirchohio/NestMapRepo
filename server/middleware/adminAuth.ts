import { Request, Response, NextFunction } from 'express';
import { db } from '../db-connection';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Admin emails - add your email here
const ADMIN_EMAILS = [
  'jbirch33@gmail.com', // Jonas - founder
  'jonas@remvana.com',
  'admin@remvana.com',
  // Add other trusted admin emails as needed
];

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

    // Check if user is admin by role or email
    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(user.email);
    
    if (!isAdmin) {
      logger.warn(`Non-admin user ${user.email} attempted to access admin route`);
      return res.status(403).json({ message: 'Admin access required' });
    }

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