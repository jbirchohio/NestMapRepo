import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db-connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAuthTokens } from '../utils/secureJwt.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  organizationId: z.string().uuid().optional(),
});

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
};

// Login endpoint
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate JWT tokens
    const tokens = await generateAuthTokens(
      user.id,
      user.email,
      user.role as any
    );

    // Return success response
    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
});

// Register endpoint
router.post('/register', validateRequest(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, username, organizationId } = req.body;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      role: 'member', // Default role
      organizationId: organizationId || null,
      emailVerified: false
    }).returning();

    // Generate JWT tokens
    const tokens = await generateAuthTokens(
      newUser.id,
      newUser.email,
      newUser.role as any
    );

    // Return success response
    res.status(201).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    });

  } catch (error) {
    logger.error('Register error:', error);
    next(error);
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // In a more sophisticated setup, you might maintain a blacklist of tokens
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user endpoint
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This route should be protected by the authenticate middleware
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
});

export default router;
