import { Router } from 'express';
import { eq } from '../utils/drizzle-shim';
import { and, or } from '../utils/drizzle-shim';
import { desc } from '../utils/drizzle-shim';
// TODO: Fix count and sql imports - may need different approach
import { sql } from '../utils/drizzle-shim';
import { count } from '../utils/drizzle-shim';
import { db } from '../db/db';
import { users } from '../db/schema';
import { authenticateJWT } from '../middleware/auth.js';
import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.enum(['member', 'manager', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string().uuid()),
  updates: z.object({
    role: z.enum(['member', 'manager', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
});

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['member', 'manager', 'admin']).default('member'),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Simple audit logger fallback
const auditLogger = {
  log: async (data: any) => {
    console.log('Audit log:', data);
  }
};

// Get users for organization
router.get('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    
    // Only managers and admins can view organization users
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to view organization users" });
    }

    const { search, role, status, page = 1, limit = 50 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [eq(users.organizationId, organizationId)];
    
    if (search) {
      whereConditions.push(
        or(
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }
    
    if (role) {
      whereConditions.push(eq(users.role, role as string));
    }
    
    if (status === 'active') {
      whereConditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      whereConditions.push(eq(users.isActive, false));
    }
    
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        lastLoginIp: users.lastLoginIp,
        failedLoginAttempts: users.failedLoginAttempts,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(...whereConditions));

    // Get role distribution
    const roleStats = await db
      .select({
        role: users.role,
        count: count()
      })
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .groupBy(users.role);

    await auditLogger.log({
      action: 'users_viewed',
      userId: req.user.userId,
      organizationId,
      details: { 
        filters: { search, role, status },
        resultCount: usersList.length 
      }
    });

    res.json({
      users: usersList,
      stats: {
        total: totalCount.count,
        byRole: roleStats,
        active: usersList.filter(u => u.isActive).length,
        inactive: usersList.filter(u => !u.isActive).length,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const userId = req.params.userId;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    
    // Only managers and admins can view user details
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to view user details" });
    }
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        lastLoginIp: users.lastLoginIp,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId)
      ));
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await auditLogger.log({
      action: 'user_viewed',
      userId: req.user.userId,
      organizationId,
      entityId: userId,
      details: { targetUserEmail: user.email }
    });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only admins can create users
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to create users" });
    }
    
    const validatedData = createUserSchema.parse(req.body);
    
    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email));
    
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    // Hash the temporary password (simplified - in production use proper hashing)
    const passwordHash = await hashPassword(validatedData.temporaryPassword);
    
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        username: validatedData.email, // Use email as username
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        role: validatedData.role,
        organizationId,
        isActive: true,
        emailVerified: false,
      })
      .returning();

    await auditLogger.log({
      action: 'user_created',
      userId,
      organizationId,
      entityId: newUser.id,
      details: { 
        email: newUser.email,
        role: newUser.role,
        name: `${newUser.firstName} ${newUser.lastName}`
      }
    });
    
    // Remove sensitive data from response
    const { passwordHash: _, ...userResponse } = newUser;
    res.status(201).json(userResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error creating user:', error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
router.patch('/:userId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const targetUserId = req.params.userId;
    const organizationId = req.user.organizationId;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;
    
    // Get existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, targetUserId),
        eq(users.organizationId, organizationId)
      ));
    
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check permissions
    const canEditUser = userRole === 'admin' || 
                       (userRole === 'manager' && existingUser.role === 'member') ||
                       (currentUserId === targetUserId); // Users can edit themselves (limited)
    
    if (!canEditUser) {
      return res.status(403).json({ error: "Insufficient permissions to edit this user" });
    }
    
    const updateData = updateUserSchema.parse(req.body);
    
    // Restrict what users can update about themselves
    if (currentUserId === targetUserId && userRole !== 'admin') {
      // Users can only update their own name and email, not role or status
      delete updateData.role;
      delete updateData.isActive;
    }
    
    // Prevent role escalation
    if (updateData.role && userRole === 'manager' && updateData.role !== 'member') {
      return res.status(403).json({ error: "Managers can only assign member role" });
    }
    
    // Check if email already exists (if being updated)
    if (updateData.email && updateData.email !== existingUser.email) {
      const [emailExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, updateData.email));
      
      if (emailExists) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }
    
    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUserId))
      .returning();

    await auditLogger.log({
      action: 'user_updated',
      userId: currentUserId,
      organizationId,
      entityId: targetUserId,
      details: { 
        targetUserEmail: updatedUser.email,
        changes: updateData
      }
    });
    
    // Remove sensitive data from response
    const { passwordHash: _, ...userResponse } = updatedUser;
    res.json(userResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error updating user:', error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Bulk update users
router.patch('/bulk/update', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only admins can perform bulk updates
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required for bulk operations" });
    }
    
    const { userIds, updates } = bulkUpdateSchema.parse(req.body);
    
    // Verify all users belong to the organization
    const targetUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        sql`${users.id} = ANY(${userIds})`
      ));
    
    if (targetUsers.length !== userIds.length) {
      return res.status(400).json({ error: "Some users not found or not in your organization" });
    }
    
    // Perform bulk update
    const updatedUsers = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(sql`${users.id} = ANY(${userIds})`)
      .returning();

    await auditLogger.log({
      action: 'users_bulk_updated',
      userId,
      organizationId,
      details: { 
        userCount: userIds.length,
        updates,
        targetUserIds: userIds
      }
    });
    
    res.json({
      message: `Successfully updated ${updatedUsers.length} users`,
      updatedUsers: updatedUsers.map(({ passwordHash: _, ...user }) => user)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error bulk updating users:', error);
    res.status(500).json({ error: "Failed to bulk update users" });
  }
});

// Reset user password
router.post('/:userId/reset-password', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const targetUserId = req.params.userId;
    const organizationId = req.user.organizationId;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;
    
    // Only admins can reset passwords
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to reset passwords" });
    }
    
    // Get user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, targetUserId),
        eq(users.organizationId, organizationId)
      ));
    
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    
    // Update user password and force password change
    await db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUserId));

    await auditLogger.log({
      action: 'user_password_reset',
      userId: currentUserId,
      organizationId,
      entityId: targetUserId,
      details: { targetUserEmail: targetUser.email }
    });
    
    res.json({
      message: "Password reset successfully",
      temporaryPassword,
      email: targetUser.email
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Delete user (deactivate)
router.delete('/:userId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const targetUserId = req.params.userId;
    const organizationId = req.user.organizationId;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;
    
    // Only admins can delete users
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to delete users" });
    }
    
    // Prevent self-deletion
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    // Get user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, targetUserId),
        eq(users.organizationId, organizationId)
      ));
    
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Deactivate user instead of hard delete
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUserId))
      .returning();

    await auditLogger.log({
      action: 'user_deactivated',
      userId: currentUserId,
      organizationId,
      entityId: targetUserId,
      details: { targetUserEmail: targetUser.email }
    });
    
    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
});

// Helper functions
async function hashPassword(password: string): Promise<string> {
  // Simplified - in production use bcrypt or similar
  return `hashed_${password}`;
}

function generateTemporaryPassword(): string {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

export default router;



