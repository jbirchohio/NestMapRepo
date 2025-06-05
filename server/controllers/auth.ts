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

    const userRole = user[0].role || 'user';
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    return res.json({ 
      permissions, 
      role: userRole,
      userId: targetUserId,
      organizationId: user[0].organization_id 
    });

    // CRITICAL SECURITY: Enforce organization-based access control
    // Users can only view permissions for:
    // 1. Their own account
    // 2. Users in their organization (if they're admin/manager)
    // 3. Any user (if they're super_admin)
    
    if (numericUserId !== req.user.id) {
      // Requesting another user's permissions
      if (req.user.role === 'super_admin') {
        // Super admins can view any user's permissions
      } else if (req.user.role === 'admin' || req.user.role === 'manager') {
        // Admins/managers can only view users in their organization
        const [targetUser] = await db
          .select({ organization_id: users.organization_id })
          .from(users)
          .where(eq(users.id, numericUserId));
          
        if (!targetUser || targetUser.organization_id !== req.user.organization_id) {
          console.warn('PERMISSIONS_ACCESS_DENIED: Cross-organization access attempt', {
            requesterId: req.user.id,
            requesterOrgId: req.user.organization_id,
            targetUserId: numericUserId,
            targetUserOrgId: targetUser?.organization_id,
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
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, numericUserId));
      
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    res.json({ permissions, role: user.role });
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