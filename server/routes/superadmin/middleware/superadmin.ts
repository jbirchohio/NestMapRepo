import { Response, NextFunction } from 'express';
import type { CustomRequest } from '../../../types/custom-express';

export function requireSuperadmin(req: CustomRequest, res: Response, next: NextFunction) {
  // Check if user is authenticated and has superadmin role
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Access denied. Superadmin privileges required.',
      code: 'FORBIDDEN'
    });
  }
  
  next();
  return;
}
