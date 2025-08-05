import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { db } from "../db-connection";
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Helper function to create JWT token
function createAuthToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_dev_secret');
}

// POST /api/auth/social/google - Google Sign In
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let [user] = await db.select().from(users).where(eq(users.email, email!));

    if (!user) {
      // Create new user
      const username = name?.replace(/\s+/g, '').toLowerCase() || email!.split('@')[0];
      
      [user] = await db.insert(users).values({
        auth_id: `google_${googleId}`,
        email: email!,
        username: username,
        password_hash: null, // No password for social login
        display_name: name,
        avatar_url: picture,
        role: 'user',
        role_type: 'consumer',
        created_at: new Date(),
      }).returning();
      
      logger.info(`New user registered via Google: ${email}`);
    } else {
      // Update user info if needed
      if (picture && picture !== user.avatar_url) {
        await db.update(users)
          .set({ avatar_url: picture })
          .where(eq(users.id, user.id));
      }
    }

    const token = createAuthToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.display_name,
        avatarUrl: user.avatar_url,
      }
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});


// GET /api/auth/social/providers - Get enabled social providers
router.get('/providers', (req: Request, res: Response) => {
  const providers = [];
  
  if (process.env.GOOGLE_CLIENT_ID) {
    providers.push({
      name: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID,
    });
  }
  
  res.json({ providers });
});

export default router;