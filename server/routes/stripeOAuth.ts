import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

/**
 * OAuth callback handler for Stripe Connect
 */
router.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code as string,
    });

    const { stripe_user_id, access_token } = response;

    // If state parameter contains organization ID, update the organization
    if (state) {
      const organizationId = parseInt(state as string);
      
      await db
        .update(organizations)
        .set({
          stripe_connect_account_id: stripe_user_id,
          stripe_issuing_enabled: false, // Will be enabled after verification
          updated_at: new Date()
        })
        .where(eq(organizations.id, organizationId));
    }

    // Redirect back to the funding page with success
    res.redirect('/organization-funding?setup=success');
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect('/organization-funding?setup=error');
  }
});

/**
 * Generate OAuth authorization URL
 */
router.post('/oauth/authorize', async (req, res) => {
  try {
    const { organizationId } = req.body;

    if (!process.env.STRIPE_CONNECT_CLIENT_ID) {
      return res.status(400).json({ 
        error: 'Stripe Connect Client ID is required. Please provide your Connect application Client ID from Stripe Dashboard.' 
      });
    }

    // Log the client ID for debugging (first 10 characters only)
    console.log('Using Stripe Connect Client ID:', process.env.STRIPE_CONNECT_CLIENT_ID?.substring(0, 10) + '...');
    
    const redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/stripe/oauth/callback`;
    
    console.log('OAuth redirect URI:', redirectUri);

    const authUrl = `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code` +
      `&client_id=${process.env.STRIPE_CONNECT_CLIENT_ID}` +
      `&scope=read_write` +
      `&redirect_uri=${redirectUri}` +
      `&state=${organizationId}`;

    console.log('Generated OAuth URL:', authUrl.substring(0, 100) + '...');
    res.json({ authUrl });
  } catch (error: any) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

export default router;