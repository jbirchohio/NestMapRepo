import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';
import { db } from '../server/db';
import { organizations, users, whiteLabelSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

describe('White Label Integration', () => {
  let authToken: string;
  let orgId: number;
  let userId: number;

  beforeAll(async () => {
    // Create test organization with free plan
    const [org] = await db.insert(organizations).values({
      name: 'Test Org',
      plan: 'free'
    }).returning();
    orgId = org.id;

    // Create test user
    const [user] = await db.insert(users).values({
      auth_id: 'test-auth-id',
      username: 'testuser',
      email: 'test@example.com',
      organization_id: orgId
    }).returning();
    userId = user.id;

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(whiteLabelSettings).where(eq(whiteLabelSettings.organization_id, orgId));
    await db.delete(users).where(eq(users.organization_id, orgId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  describe('White Label Access Control', () => {
    it('should block white label access on free plan', async () => {
      const res = await request(app)
        .get('/api/white-label/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.canAccessWhiteLabel).toBe(false);
      expect(res.body.upgradeRequired).toBe(true);
    });

    it('should allow white label access after upgrading to pro plan', async () => {
      // Upgrade organization to pro plan
      await db.update(organizations)
        .set({ plan: 'pro' })
        .where(eq(organizations.id, orgId));

      const res = await request(app)
        .get('/api/white-label/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.canAccessWhiteLabel).toBe(true);
      expect(res.body.upgradeRequired).toBe(false);
    });
  });

  describe('White Label Configuration', () => {
    beforeEach(async () => {
      // Ensure organization is on pro plan
      await db.update(organizations)
        .set({ plan: 'pro' })
        .where(eq(organizations.id, orgId));
    });

    it('should save and retrieve white label configuration', async () => {
      // Save white label configuration
      const configData = {
        companyName: 'Custom Brand',
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        accentColor: '#3357FF',
        tagline: 'Custom Travel Management',
        logoUrl: 'https://example.com/logo.png'
      };

      const saveRes = await request(app)
        .post('/api/white-label/configure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(configData);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);

      // Retrieve white label configuration
      const getRes = await request(app)
        .get('/api/white-label/config')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.isWhiteLabelActive).toBe(true);
      expect(getRes.body.config.companyName).toBe(configData.companyName);
      expect(getRes.body.config.primaryColor).toBe(configData.primaryColor);
    });
  });

  describe('Custom Domain Management', () => {
    beforeEach(async () => {
      // Ensure organization is on pro plan
      await db.update(organizations)
        .set({ plan: 'pro' })
        .where(eq(organizations.id, orgId));
    });

    it('should register a custom domain', async () => {
      const domainData = {
        domain: 'example-travel.com',
        subdomain: 'app'
      };

      const res = await request(app)
        .post(`/api/organizations/${orgId}/domains`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(domainData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.domain).toBe(domainData.domain);
      expect(res.body.verificationRequired).toBe(true);
    });

    it('should list registered domains', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgId}/domains`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].domain).toBe('example-travel.com');
    });
  });

  describe('End-to-End White Label Flow', () => {
    it('should handle the complete white label setup flow', async () => {
      // Step 1: Start with free plan (no white label access)
      await db.update(organizations)
        .set({ plan: 'free' })
        .where(eq(organizations.id, orgId));

      const initialCheck = await request(app)
        .get('/api/white-label/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialCheck.body.canAccessWhiteLabel).toBe(false);

      // Step 2: Upgrade to pro plan
      await db.update(organizations)
        .set({ plan: 'pro' })
        .where(eq(organizations.id, orgId));

      const upgradeCheck = await request(app)
        .get('/api/white-label/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(upgradeCheck.body.canAccessWhiteLabel).toBe(true);

      // Step 3: Configure white label branding
      const configData = {
        companyName: 'Travel Enterprise',
        primaryColor: '#1A2B3C',
        secondaryColor: '#4D5E6F',
        accentColor: '#7A8B9C',
        tagline: 'Enterprise Travel Management',
        logoUrl: 'https://example.com/enterprise-logo.png'
      };

      await request(app)
        .post('/api/white-label/configure')
        .set('Authorization', `Bearer ${authToken}`)
        .send(configData);

      // Step 4: Register custom domain
      const domainData = {
        domain: 'enterprise-travel.com',
        subdomain: 'portal'
      };

      await request(app)
        .post(`/api/organizations/${orgId}/domains`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(domainData);

      // Step 5: Verify complete setup
      const finalCheck = await request(app)
        .get('/api/white-label/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalCheck.status).toBe(200);
      expect(finalCheck.body.isConfigured).toBe(true);
      expect(finalCheck.body.hasDomain).toBe(true);
      expect(finalCheck.body.isActive).toBe(true);
    });
  });
});
