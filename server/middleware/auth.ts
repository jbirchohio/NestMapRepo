import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string | null;
    organization_id: number | null;
    email: string;
    username: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!req.user.role || (!req.user.role.includes('admin') && !req.user.role.includes('superadmin'))) {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
}

export function requireSuperadminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!req.user.role || !req.user.role.includes('superadmin')) {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  
  next();
}