import type { Request, Response } from "express";
import { db } from "../db-connection";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";
import { ROLE_PERMISSIONS } from "../rbac";

/**
 * Authentication Controller - Supabase Only
 * Removed Passport.js dependencies for simplified auth flow
 */

// User permissions endpoint with proper authorization
export async function getUserPermissions(req: Request, res: Response) {
  try {
    // CRITICAL: Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedUserId = req.query.userId as string;
    
    // Handle demo users
    if (requestedUserId && (requestedUserId.startsWith('demo-corp-') || requestedUserId.startsWith('demo-agency-'))) {
      const permissions = ["manage_users", "manage_organizations", "view_analytics", "export_data"];
      return res.json({ permissions, role: "admin" });
    }
    
    const numericUserId = Number(requestedUserId);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // CRITICAL SECURITY: Authorization check - users can only view their own permissions or admins can view team members
    const canViewPermissions = 
      req.user.id === numericUserId || // User viewing their own permissions
      req.user.role === 'super_admin' || // Super admin can view any user
      (req.user.role === 'admin' && req.user.organization_id); // Admin can view users in their org

    if (!canViewPermissions) {
      console.warn('PERMISSIONS_ACCESS_DENIED: User attempted to view another user\'s permissions', {
        requestingUserId: req.user.id,
        requestingUserRole: req.user.role,
        requestingUserOrgId: req.user.organization_id,
        targetUserId: numericUserId,
        endpoint: '/api/user/permissions',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({ 
        error: "Access denied", 
        message: "You can only view your own permissions or team members' permissions if you are an admin" 
      });
    }
    
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, numericUserId));
      
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // CRITICAL: For admin users viewing team members, ensure same organization
    if (req.user.role === 'admin' && req.user.id !== numericUserId) {
      if (targetUser.organization_id !== req.user.organization_id) {
        console.warn('CROSS_ORG_PERMISSIONS_ACCESS_DENIED: Admin attempted to view user from different organization', {
          adminUserId: req.user.id,
          adminOrgId: req.user.organization_id,
          targetUserId: numericUserId,
          targetUserOrgId: targetUser.organization_id,
          timestamp: new Date().toISOString()
        });
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only view permissions for users in your organization" 
        });
      }
    }
    
    const permissions = ROLE_PERMISSIONS[targetUser.role as keyof typeof ROLE_PERMISSIONS] || [];
    res.json({ permissions, role: targetUser.role });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
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
    console.error("Error creating user:", error);
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
    console.error("Error getting user by auth ID:", error);
    res.status(500).json({ message: "Could not retrieve user" });
  }
}