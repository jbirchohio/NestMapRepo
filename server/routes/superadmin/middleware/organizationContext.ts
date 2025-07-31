import { Request, Response, NextFunction } from 'express';

export function injectOrganizationContext(req: Request, _res: Response, next: NextFunction) {
  // Add organization context to the request if needed
  // TODO: implement based on your actual requirements
  (req as any).organizationContext = {
    // Add any organization context needed for superadmin operations
  };
  
  next();
}
