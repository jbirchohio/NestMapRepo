import { Request, Response, NextFunction } from 'express';

// Basic organization permission middleware for the modular routes
export function requireOrgPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // For now, allow all authenticated users - this would be expanded with proper RBAC
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: "Authentication required" });
    }
  };
}