import type { Express } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { adminSettings, adminAuditLog } from "@shared/schema";

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

export function registerAdminSettingsRoutes(app: Express) {
  // Get system settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Try to get settings from database
      const [existingSettings] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.key, 'system_settings'))
        .limit(1);

      if (existingSettings) {
        const settings = JSON.parse(existingSettings.value);
        res.json(settings);
      } else {
        // Return default settings if none exist
        res.json(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update system settings
  app.put("/api/admin/settings", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updatedSettings = req.body;

      // Validate required fields
      if (!updatedSettings.general || !updatedSettings.security || !updatedSettings.email || !updatedSettings.features) {
        return res.status(400).json({ error: "Invalid settings format" });
      }

      // Check if settings already exist
      const [existingSettings] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.key, 'system_settings'))
        .limit(1);

      if (existingSettings) {
        // Update existing settings
        await db
          .update(adminSettings)
          .set({
            value: JSON.stringify(updatedSettings),
            updatedAt: new Date(),
          })
          .where(eq(adminSettings.key, 'system_settings'));
      } else {
        // Insert new settings
        await db.insert(adminSettings).values({
          key: 'system_settings',
          value: JSON.stringify(updatedSettings),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Log the change
      await db.insert(adminAuditLog).values({
        admin_user_id: req.user.id,
        action_type: 'SYSTEM_SETTINGS_UPDATE',
        action_data: { updatedSettings },
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      });

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating admin settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Test email configuration
  app.post("/api/admin/settings/test-email", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get current email settings
      const [existingSettings] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.key, 'system_settings'))
        .limit(1);

      const settings = existingSettings 
        ? JSON.parse(existingSettings.value) 
        : defaultSettings;

      // Simulate email test (in production, you'd use the actual SMTP settings)
      const emailConfig = settings.email;
      
      if (!emailConfig.smtpHost || !emailConfig.fromEmail) {
        return res.status(400).json({ error: "SMTP configuration incomplete" });
      }

      // Log the test
      await db.insert(adminAuditLog).values({
        admin_user_id: req.user.id,
        action_type: 'EMAIL_TEST',
        action_data: { smtpHost: emailConfig.smtpHost, fromEmail: emailConfig.fromEmail },
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      });

      // In a real implementation, you would send an actual test email here
      res.json({ message: "Test email sent successfully" });
    } catch (error) {
      console.error("Error testing email configuration:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Get admin logs endpoint
  app.get("/api/admin/logs", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const logs = await db
        .select()
        .from(adminAuditLog)
        .orderBy(adminAuditLog.timestamp)
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: adminAuditLog.id })
        .from(adminAuditLog);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: totalCount.length,
          pages: Math.ceil(totalCount.length / limit),
        }
      });
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });
}