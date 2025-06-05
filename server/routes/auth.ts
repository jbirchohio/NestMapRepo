import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertUserSchema, registerUserSchema, loginSchema } from '@shared/schema';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { authenticateUser, hashPassword, getUserById } from '../auth';
import { storage } from '../storage';

const router = Router();

// User registration
router.post("/register", async (req: Request, res: Response) => {
  try {
    const userData = registerUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    // Hash password before storing
    const hashedPassword = hashPassword(userData.password);

    // Create user data for storage (transform to database schema)
    const { password, ...userDataForDb } = userData;
    const user = await storage.createUser({
      ...userDataForDb,
      password_hash: hashedPassword
    });

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    res.status(201).json({ user: userResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user data", errors: error.errors });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Could not create user" });
  }
});

// User login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Set user session with proper typing
    (req.session as any).user_id = user.id;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      // Return user response without sensitive data
      const userResponse = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        displayName: user.displayName
      };
      res.json({ user: userResponse });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Could not authenticate user" });
  }
});

// User logout
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out successfully" });
  });
});

// Session check endpoint (for middleware)
router.get("/session", async (req: Request, res: Response) => {
  try {
    const sessionUserId = (req.session as any)?.user_id;

    if (!sessionUserId) {
      return res.status(401).json({ message: "No active session" });
    }

    const user = await getUserById(sessionUserId);
    if (!user) {
      // Clear invalid session
      delete (req.session as any).user_id;
      return res.status(401).json({ message: "Invalid session" });
    }

    // Return user session data
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      displayName: user.displayName
    };
    res.json({ user: userResponse });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ message: "Session check failed" });
  }
});

// Get current user (requires authentication)
router.get("/me", unifiedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Remove password from response
    const { password, ...userResponse } = req.user;
    res.json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Could not fetch user information" });
  }
});

// Update user profile (requires authentication)
router.put("/profile", unifiedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const updateData = insertUserSchema.partial().parse(req.body);

    // If password_hash is being updated, hash it
    if (updateData.password_hash) {
      updateData.password_hash = hashPassword(updateData.password_hash);
    }

    const updatedUser = await storage.updateUser(req.user.id, updateData);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password hash from response
    const { password_hash, ...userResponse } = updatedUser;
    res.json({ user: userResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user data", errors: error.errors });
    }
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Could not update user profile" });
  }
});

// Check authentication status
router.get("/status", (req: Request, res: Response) => {
  res.json({ 
    authenticated: !!(req.session as any).user_id,
    sessionId: req.sessionID
  });
});

// Alias routes for documented API endpoints
// POST /api/users (alias for /api/auth/register)
router.post("/users", async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    // Hash password if provided
    if (userData.password_hash) {
      userData.password_hash = hashPassword(userData.password_hash);
    }

    const user = await storage.createUser(userData);
    
    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    res.status(201).json(userResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user data", errors: error.errors });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Could not create user" });
  }
});

// GET /api/users/auth/:authId (documented endpoint)
router.get("/users/auth/:authId", async (req: Request, res: Response) => {
  try {
    const authId = req.params.authId;
    const user = await storage.getUserByAuthId(authId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user by auth ID:", error);
    res.status(500).json({ message: "Could not fetch user" });
  }
});

export default router;