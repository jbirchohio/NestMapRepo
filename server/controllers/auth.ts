import type { Request, Response } from "express";
import { db } from "../db-connection";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";
// RBAC removed for consumer app
import { logger } from "../utils/logger";

/**
 * Authentication Controller - Supabase Only
 * Removed Passport.js dependencies for simplified auth flow
 */

// User permissions endpoint
export async function getUserPermissions(req: Request, res: Response) {
  try {
    // CRITICAL SECURITY: Require authentication
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedUserId = req.query.user_id as string;

    // Handle demo users
    if (requestedUserId && (requestedUserId.startsWith('demo-corp-') || requestedUserId.startsWith('demo-agency-'))) {
      const permissions = ["manage_users", "manage_organizations", "view_analytics", "export_data"];
      return res.json({ permissions, role: "admin" });
    }

    // Use authenticated user's ID if no specific user requested
    const targetUserId = requestedUserId ? Number(requestedUserId) : req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get user permissions based on role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({ error: "User not found" });
    }

    // CRITICAL SECURITY: Enforce organization-based access control
    // Users can only view permissions for:
    // 1. Their own account
    // 2. Users in their organization (if they're admin/manager)
    // 3. Any user (if they're super_admin)

    if (targetUserId !== req.user!.id) {
      // Requesting another user's permissions
      if (req.user!.role === 'super_admin') {
        // Super admins can view any user's permissions
      } else if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        // Admins/managers can only view users in their organization
        if (!user[0] || user[0].organization_id !== req.user!.organization_id) {
          logger.warn('PERMISSIONS_ACCESS_DENIED: Cross-organization access attempt', {
            requesterId: req.user!.id,
            requesterOrgId: req.user!.organization_id,
            targetUserId: targetUserId,
            targetUserOrgId: user[0]?.organization_id,
            endpoint: '/api/user/permissions',
            timestamp: new Date().toISOString()
          });
          return res.status(403).json({
            error: "Access denied",
            message: "Cannot view permissions for users outside your organization"
          });
        }
      } else {
        // Regular users can only view their own permissions
        return res.status(403).json({
          error: "Access denied",
          message: "Can only view your own permissions"
        });
      }
    }

    const userRole = user[0].role || 'user';
    // Simple consumer permissions
    const permissions = ['manage_trips', 'view_trips', 'create_activities'];

    return res.json({
      permissions,
      role: userRole,
      userId: targetUserId,
      organizationId: user[0].organization_id
    });
  } catch (error) {
    logger.error("Error fetching user permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
}

// Create user with Supabase integration
export async function createUser(req: Request, res: Response) {
  try {
    const userData = insertUserSchema.parse(req.body);

    // Check if user already exists by auth_id
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, userData.auth_id))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await storage.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user data", errors: error.errors });
    }
    logger.error("Error creating user:", error);
    res.status(500).json({ message: "Could not create user" });
  }
}

// Get user by auth_id - used with Supabase
export async function getUserByAuthId(req: Request, res: Response) {
  try {
    const authId = req.params.authId;

    if (!authId) {
      return res.status(400).json({ message: "Auth ID is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error getting user by auth ID:", error);
    res.status(500).json({ message: "Could not retrieve user" });
  }
}