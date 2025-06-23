import { db } from "../db/db.js";
import { eq, count, and, desc } from "drizzle-orm";
import { adminSettings, adminAuditLog } from "../db/schema.js";
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import type { Express, Response, NextFunction, RequestHandler, Request as ExpressRequest } from 'express';
import { parse as json2csv } from 'json2csv';

// Define our custom user and organization types
type AuthUser = {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
};

type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
};

// Create a type that omits the existing user property and adds our custom one
type CustomRequest = Omit<ExpressRequest, 'user'> & {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    settings?: Record<string, unknown>;
  } | null;
}

// Define custom types for our extended request properties
type User = CustomRequest['user'];
type Organization = NonNullable<CustomRequest['organization']>;

interface SystemSettings {
    general: {
        platformName: string;
        maintenanceMode: boolean;
        registrationEnabled: boolean;
        emailVerificationRequired: boolean;
        maxUsersPerOrganization: number;
        sessionTimeoutMinutes: number;
    };
    security: {
        enforcePasswordComplexity: boolean;
        requireTwoFactor: boolean;
        passwordExpiryDays: number;
        maxLoginAttempts: number;
        lockoutDurationMinutes: number;
    };
    email: {
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
        fromEmail: string;
        fromName: string;
    };
    features: {
        enableAIFeatures: boolean;
        enableFlightBooking: boolean;
        enableCorporateCards: boolean;
        enableAnalytics: boolean;
        enableWhiteLabel: boolean;
    };
}
const defaultSettings: SystemSettings = {
    general: {
        platformName: "NestMap",
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerificationRequired: true,
        maxUsersPerOrganization: 100,
        sessionTimeoutMinutes: 480,
    },
    security: {
        enforcePasswordComplexity: true,
        requireTwoFactor: false,
        passwordExpiryDays: 90,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
    },
    email: {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: parseInt(process.env.SMTP_PORT || "587"),
        smtpSecure: process.env.SMTP_SECURE === "true",
        fromEmail: process.env.FROM_EMAIL || "noreply@nestmap.com",
        fromName: process.env.FROM_NAME || "NestMap",
    },
    features: {
        enableAIFeatures: true,
        enableFlightBooking: true,
        enableCorporateCards: true,
        enableAnalytics: true,
        enableWhiteLabel: true,
    },
};
// Helper function to wrap route handlers with proper error handling
const asyncHandler = <T = any>(
  handler: (req: CustomRequest, res: Response<T>, next: NextFunction) => Promise<void | Response<T>>
): RequestHandler => {
  return (req, res: Response, next) => {
    return Promise.resolve(handler(req as CustomRequest, res as Response<T>, next)).catch(next);
  };
};

export function registerAdminSettingsRoutes(app: Express) {
    // Apply middleware for admin settings routes
    app.use('/api/admin/settings', 
        validateJWT as RequestHandler,
        injectOrganizationContext as RequestHandler,
        validateOrganizationAccess as RequestHandler
    );
    
    // Apply middleware for admin logs routes
    app.use('/api/admin/logs',
        validateJWT as RequestHandler,
        injectOrganizationContext as RequestHandler,
        validateOrganizationAccess as RequestHandler
    );
    
        // Get system settings endpoint
    app.get("/api/admin/settings", asyncHandler(async (req, res) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const settings = await db.select().from(adminSettings).limit(1);
      return res.json(settings[0] || {});
    }));
    
    // Update system settings endpoint
    app.put("/api/admin/settings", asyncHandler(async (req, res) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const updatedSettings = req.body;
      const [settings] = await db
          .update(adminSettings)
          .set(updatedSettings)
          .returning();
          
      // Log the update
      await db.insert(adminAuditLog).values({
          action: 'SYSTEM_SETTINGS_UPDATE',
          metadata: { updatedSettings },
          ipAddress: req.ip || (req.socket?.remoteAddress?.toString() || 'unknown'),
          userAgent: Array.isArray(req.headers['user-agent']) 
              ? req.headers['user-agent'][0] 
              : req.headers['user-agent'] || 'unknown',
          userId: req.user?.id || null,
          organizationId: req.organization?.id || null,
          entityType: 'system_settings',
          entityId: null
      });
      
      return res.json(settings);
    }));
    
    // Test email configuration
    app.post("/api/admin/settings/test-email", asyncHandler(async (req: CustomRequest, res) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
          
      const { email } = req.body as { email: string };
      if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
          return res.status(400).json({ error: "Valid email address is required" });
      }
      
      // Here you would implement the actual email sending logic
      // For now, we'll just log and return success
      console.log(`[TEST EMAIL] Would send test email to: ${email}`);
      
      // Log the test email action
      await db.insert(adminAuditLog).values({
          action: 'TEST_EMAIL',
          metadata: { email },
          ipAddress: req.ip || (req.socket?.remoteAddress?.toString() || 'unknown'),
          userAgent: Array.isArray(req.headers['user-agent']) 
              ? req.headers['user-agent'][0] 
              : req.headers['user-agent'] || 'unknown',
          userId: req.user.id,
          organizationId: req.organization?.id || null,
          entityType: 'system_settings',
          entityId: null
      });
      
      return res.json({ success: true, message: "Test email would be sent" });
    }));
    
    // Get admin logs endpoint
    app.get("/api/admin/logs", asyncHandler(async (req: CustomRequest, res: Response) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
          
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;
      
      // Get logs with pagination
      const logs = await db
          .select()
          .from(adminAuditLog)
          .orderBy(desc(adminAuditLog.createdAt))
          .limit(limitNum)
          .offset(offset);
          
      // Get total count for pagination
      const [{ count: totalCount }] = await db
          .select({ count: count() })
          .from(adminAuditLog);
          
      const total = Number(totalCount);
      return res.json({
          data: logs,
          pagination: {
              total,
              page: pageNum,
              limit: limitNum,
              totalPages: Math.ceil(total / limitNum)
          }
      });
    }));
    // Export admin logs as CSV
    app.get("/api/admin/logs/export", asyncHandler(async (req: CustomRequest, res: Response) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const logs = await db
          .select()
          .from(adminAuditLog)
          .orderBy(desc(adminAuditLog.createdAt));

      // Convert logs to CSV
      const fields = ['id', 'action', 'entityType', 'entityId', 'createdAt'];
      const opts = { fields };
      const csv = json2csv(logs, opts);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=admin-logs-export.csv');
      
      return res.send(csv);
    }));
}
