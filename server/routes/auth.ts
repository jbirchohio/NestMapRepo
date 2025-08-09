import express, { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth';
import { db } from "../db-connection";
import { users, organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import socialAuthRoutes from './auth-social';
import { authRateLimit } from '../middleware/rateLimiting';

const router = express.Router();

// Secure JWT creation function with proper HMAC signing
import crypto from 'crypto';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';

function createJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Use proper HMAC signing with secret key
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_production';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
    
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Register endpoint with rate limiting
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Check if signups are enabled
    const { getSetting } = await import('../services/systemSettingsService');
    const signupsEnabled = await getSetting('enable_signups');
    
    if (signupsEnabled === false) {
      return res.status(403).json({ message: 'Public signups are currently disabled' });
    }
    
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Email, password, and username are required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get default settings
    const defaultTrialDays = await getSetting('default_trial_days') || 14;
    const defaultSeats = await getSetting('default_organization_seats') || 5;
    
    // Create default organization for new user
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + defaultTrialDays);
    
    const [organization] = await db.insert(organizations).values({
      name: `${username}'s Organization`,
      plan: 'trial',
      white_label_enabled: false
    }).returning();

    // Create user
    const [user] = await db.insert(users).values({
      email,
      username,
      auth_id: `jwt_${Date.now()}_${Math.random()}`,
      password_hash: hashedPassword,
      role: 'admin',
      organization_id: organization.id
    }).returning();

    // Create JWT token
    const token = createJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      organization_id: user.organization_id
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id
      },
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash || '');
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    await db.update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, user.id));

    // Create JWT token
    const token = createJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      organization_id: user.organization_id
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id
      },
      token
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user endpoint
router.get('/user', async (req: Request, res: Response) => {
  try {
    // Check for auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify JWT signature
      const [headerB64, payloadB64, signatureB64] = token.split('.');
      if (!headerB64 || !payloadB64 || !signatureB64) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      // Verify signature
      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_production';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signatureB64 !== expectedSignature) {
        return res.status(401).json({ message: 'Invalid token signature' });
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      
      // Check expiration if present
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return res.status(401).json({ message: 'Token expired' });
      }

      // Get fresh user data from database
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        organization_id: users.organization_id,
        display_name: users.display_name,
        avatar_url: users.avatar_url
      }).from(users).where(eq(users.id, payload.id)).limit(1);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Mount social auth routes
router.use('/social', socialAuthRoutes);

export default router;