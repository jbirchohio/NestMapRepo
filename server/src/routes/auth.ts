import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { users } from '../db/schema';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(1),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  organizationId: z.string().optional(),
});

// JWT helper functions
const generateToken = (user: any) => {
  const payload = { 
    userId: user.id, 
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const db = getDatabase();
    
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' },
      });
    }

    // Verify password using passwordHash field
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' },
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login
    await db.update(users).set({
      lastLoginAt: new Date(),
    }).where(eq(users.id, user.id));

    logger.info(`User ${user.email} logged in successfully`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid input', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username, firstName, lastName, organizationId } = registerSchema.parse(req.body);
    
    const db = getDatabase();
    
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'User already exists' },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      username: username,
      firstName: firstName || '',
      lastName: lastName || '',
      organizationId,
      role: 'member',
      isActive: true,
      emailVerified: false,
    }).returning({
      id: users.id,
      email: users.email,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      organizationId: users.organizationId,
    });

    // Generate JWT token
    const token = generateToken(newUser);

    logger.info(`New user registered: ${newUser.email}`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: newUser,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid input', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  // We could implement a token blacklist here if needed
  
  logger.info('User logged out');
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
