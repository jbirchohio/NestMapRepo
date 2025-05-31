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
    const userId = req.query.userId as string;
    
    // Handle demo users
    if (userId && (userId.startsWith('demo-corp-') || userId.startsWith('demo-agency-'))) {
      const permissions = ["manage_users", "manage_organizations", "view_analytics", "export_data"];
      return res.json({ permissions, role: "admin" });
    }
    
    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
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