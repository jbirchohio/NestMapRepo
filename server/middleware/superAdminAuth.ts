import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Super admin email from environment
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'jbirch33@gmail.com';

// Middleware to check if user is super admin (for financial access)
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is super admin
    const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;
    
    if (!isSuperAdmin) {
      logger.warn(`Non-super-admin user ${req.user.email} attempted to access financial route`);
      return res.status(403).json({ message: 'Super admin access required' });
    }

    // User is super admin, proceed
    (req as any).isSuperAdmin = true;
    next();
  } catch (error) {
    logger.error('Super admin auth error:', error);
    res.status(500).json({ message: 'Authorization failed' });
  }
};