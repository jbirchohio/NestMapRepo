import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { users } from '../db/schema';
import { logger } from '../utils/logger';

const router = Router();

// NextAuth.js compatible endpoints

// GET /api/auth/providers
router.get('/auth/providers', (req, res) => {
  logger.info('NextAuth providers request');
  res.json({
    credentials: {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      }
    }
  });
});

// GET /api/auth/session
router.get('/auth/session', (req, res) => {
  logger.info('NextAuth session request');
  // For now, return null session - this will be handled by the client
  res.json({ user: null });
});

// POST /api/auth/signin/credentials
router.post('/auth/signin/credentials', async (req, res) => {
  try {
    logger.info('NextAuth credentials signin request');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    logger.info(`User authenticated successfully: ${user.email}`);

    // Return NextAuth.js compatible response
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        organizationId: user.organizationId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signout
router.post('/auth/signout', (req, res) => {
  logger.info('NextAuth signout request');
  res.json({ url: '/' });
});

// GET /api/auth/csrf
router.get('/auth/csrf', (req, res) => {
  logger.info('NextAuth CSRF request');
  res.json({ csrfToken: 'mock-csrf-token' });
});

// GET /api/auth/error
router.get('/auth/error', (req, res) => {
  logger.info('NextAuth error request');
  const error = req.query.error || 'Unknown error';
  res.json({ 
    error: error,
    message: 'Authentication error occurred'
  });
});



export default router;
