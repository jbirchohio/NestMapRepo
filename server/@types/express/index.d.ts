// Import the Express augmentation to ensure it's loaded
import '@types/express-serve-static-core';
import { AuthUser } from '../../shared/src/schema.js'/src/types/auth-user.js';

declare global {
  namespace Express {
    // Extend the Express Request type with our custom properties
    interface Request {
      user?: AuthUser;
      
      // Organization context properties
      organizationId?: string | number;
      organizationFilter?: (orgId: string | null) => boolean;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      
      // Request tracking properties
      requestId?: string;
      startTime?: [number, number];
      token?: string;
      
      // Metrics and monitoring
      responseMetrics?: any;
      unifiedMetrics?: any;
      
      // Analytics and scoping
      analyticsScope?: {
        organizationId: string | number;
        startDate?: Date;
        endDate?: Date;
      };
      
      // Authentication methods
      isAuthenticated?: () => boolean;
      hasRole?: (role: string | string[]) => boolean;
      hasPermission?: (permission: string | string[]) => boolean;
      
      // File upload properties
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[]; };
      
      // Standard Express properties (ensure they exist)
      cookies: {
        [key: string]: string | undefined;
      };
      body: any;
    }
  }
}
