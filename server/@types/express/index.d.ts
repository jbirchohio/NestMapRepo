import 'express-serve-static-core.js';

declare global {
  namespace Express {
    // Extend the Express Request type with our custom properties
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string | null;
        organization_id?: string | null; // For backward compatibility
        organizationTier?: string;
        displayName?: string;
        userId?: string;
      };
      cookies: {
        [key: string]: string | undefined;
      };
      params: {
        [key: string]: string;
      };
      body: any;
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
      organizationId?: string;
      organizationFilter?: (orgId: string | null) => boolean;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}
