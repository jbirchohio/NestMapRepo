import { Session } from 'express-session';

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: number;
        organizationId?: number | null;
        role?: string;
        [key: string]: any;
      };
      
      // Security middleware extensions
      apiVersion?: string;
      apiKeyAuth?: {
        keyId: string;
        organizationId: number;
        permissions: string[];
      };
      authSession?: {
        id: string;
        userId: number;
        organizationId: number;
        lastActivity: Date;
        deviceId?: string;
        ipAddress: string;
      };
      authIdentifier?: string;
      
      // Database middleware extensions
      secureQuery?: any;
      secureDbOps?: {
        select: any;
        insert: any;
        update: any;
        delete: any;
      };
      dbMetrics?: {
        startTime: number;
        queryCount: number;
        slowQueries: any[];
      };
      
      // File upload extensions
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        filename?: string;
        path?: string;
      };
      
      // Organization filtering
      organizationId?: number;
      organizationFilter?: (orgId: number | null) => boolean;
      domainOrganization?: any;
      analyticsScope?: {
        organizationId: number;
      };
    }
    
    interface Session {
      sessionId?: string;
    }
  }
}

export {};