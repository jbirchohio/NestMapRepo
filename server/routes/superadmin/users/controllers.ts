import { Request, Response } from 'express';
import { db } from '../../../src/db';
import { users, organizations, userSessions } from '../../../src/db/schema';
import { eq, and, desc, sql, isNull, inArray, like, or } from 'drizzle-orm';
import { logSuperadminAction } from '../audit-logs/audit-service';
import { hashPassword } from '../../../utils/auth';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../../types/jwt';

// Define a simple authenticated request type for superadmin operations
interface SuperadminUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string; // Required for Express User compatibility
  userId: string; // Required for Express User compatibility
  jti: string; // Required for Express User compatibility  
  iat: number; // Required for Express User compatibility
}

interface SuperadminRequest extends Request {
  user: SuperadminUser;
}

// Define UserWithOrg type at the top level
type UserWithOrg = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  name: string;
  organization: any; // Replace 'any' with proper organization type if available
  avatarUrl?: string | null; // Make avatarUrl optional since it's not in the schema
};

// Get all users with filtering and pagination
export const getUsers = async (req: SuperadminRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      role,
      organizationId,
      status = 'active' 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.username, `%${search}%`),
          sql`LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE LOWER(${`%${search}%`})`
        )
      );
    }
    if (role) {
      // Cast to the expected enum type - the role will be validated by the schema
      conditions.push(eq(users.role, role as 'super_admin' | 'admin' | 'manager' | 'member' | 'guest'));
    }
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId as string));
    }
    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'deleted') {
      conditions.push(eq(users.isActive, false));
    }

    // Conditions for filtering users

    // Get users with organization info
    // First get the user IDs with pagination
    let userIds: any[] = [];
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }
      userIds = await db
        .select({ id: users.id })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(Number(limit))
        .offset(offset);
    } catch (error) {
      console.error('Error fetching user IDs:', error);
      return res.status(500).json({ error: 'Failed to fetch user IDs' });
    }

    if (!userIds.length) {
      return res.json({
        data: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0
        }
      });
    }

    // Get the full user data with organization info for the paginated user IDs
    let usersList: any[] = [];
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }
      usersList = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          organization: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug
          }
        })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .where(inArray(users.id, userIds.map(u => u.id)));
    } catch (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ error: 'Failed to fetch user details' });
    }

    // Format the response to match the expected frontend format
    const formattedUsers = usersList.map(user => {
      const userOrg = user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug
      } : null;
      
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
        organization: userOrg,
      } as UserWithOrg;
    });

    try {
      // Get total count for pagination
      if (!db) {
        throw new Error('Database connection not available');
      }
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult?.count || 0);
      const totalPages = Math.ceil(total / Number(limit));

      return res.json({
        data: formattedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error getting user count:', error);
      return res.status(500).json({ error: 'Failed to get user count' });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get single user
export const getUser = async (req: SuperadminRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Get user by ID
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        organization: {
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug
        },
      } as const)
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, userId)) as [UserWithOrg | undefined];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format the response to match the expected frontend format
    const userOrg = user.organization ? {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug
    } : null;
    
    const formattedUser: UserWithOrg = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      organization: userOrg,
    };

    return res.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create new user
export const createUser = async (req: SuperadminRequest, res: Response): Promise<Response> => {
  try {
    const { email, password, username, firstName, lastName, role, organizationId } = req.body;
    const userId = req.user.id;

    // Check if user already exists
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashedPassword,
        username,
        firstName,
        lastName,
        role,
        organizationId,
        emailVerified: true, // Auto-verify for admin-created users
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    if (!newUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Use the user's UUID from the request (if authenticated) or default to system admin
    const actorId = req.user.id; // Use authenticated user's UUID
    await logSuperadminAction(
      actorId,
      'CREATE_USER',
      'user',
      newUser.id,
      { email, role, organizationId }
    );
    
    // Return user data without sensitive information
    const { passwordHash, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      ...userWithoutPassword,
      name: userWithoutPassword.firstName && userWithoutPassword.lastName 
        ? `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}` 
        : userWithoutPassword.username
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
export const updateUser = async (req: SuperadminRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    const currentUserId = req.user.id;

    // Don't allow updating password through this endpoint
    if (updates.password) {
      return res.status(400).json({ error: 'Use the change password endpoint to update password' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the action
    await logSuperadminAction(
      currentUserId,
      'UPDATE_USER',
      'user',
      userId,
      updates
    );
    
    // Return updated user without sensitive information
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return res.json({
      ...userWithoutPassword,
      name: userWithoutPassword.firstName && userWithoutPassword.lastName 
        ? `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}` 
        : userWithoutPassword.username
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req: SuperadminRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user.id;

    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Get user info before deletion for logging
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by setting isActive to false
    const [deletedUser] = await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();

    // Handle user not found case
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the action
    await logSuperadminAction(
      currentUserId, // Use authenticated user's UUID
      'DELETE_USER',
      'user',
      userId,
      {}
    );
    
    return res.status(200).json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user sessions
export const getUserSessions = async (req: SuperadminRequest, res: Response) => {
  try {
    const userId = req.params.id;

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const sessions = await db
      .select({
        id: userSessions.id,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress,
        createdAt: userSessions.createdAt,
        expiresAt: userSessions.expiresAt,
        // Using createdAt as lastUsedAt since lastUsedAt doesn't exist in the schema
        lastUsedAt: userSessions.createdAt,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          sql`${userSessions.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(userSessions.createdAt)); // Order by createdAt instead of lastUsedAt

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
};
