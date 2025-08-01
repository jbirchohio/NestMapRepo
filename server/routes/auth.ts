import express, { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth';
import { db } from '../db';
import { users, organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Secure JWT creation function with proper HMAC signing
import crypto from 'crypto';

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

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
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

    // Create default organization for new user
    const [organization] = await db.insert(organizations).values({
      name: `${username}'s Organization`,
      plan: 'free',
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
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
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;