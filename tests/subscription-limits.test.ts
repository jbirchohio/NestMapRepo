import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';
import { db } from '../server/db';
import { organizations, users, trips } from '../shared/schema';
import { eq } from 'drizzle-orm';
describe('Subscription Limits', () => {
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
        await db.delete(trips).where(eq(trips.organization_id, orgId));
        await db.delete(users).where(eq(users.organization_id, orgId));
        await db.delete(organizations).where(eq(organizations.id, orgId));
    });
    describe('Free Plan Limits', () => {
        it('should allow creating trips up to limit', async () => {
            // Create 3 trips (free plan limit)
            for (let i = 0; i < 3; i++) {
                const res = await request(app)
                    .post('/api/trips')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    title: `Test Trip ${i + 1}`,
                    startDate: '2024-01-01',
                    endDate: '2024-01-05',
                    city: 'New York'
                });
                expect(res.status).toBe(201);
            }
        });
        it('should block creating trips beyond limit', async () => {
            const res = await request(app)
                .post('/api/trips')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                title: 'Blocked Trip',
                startDate: '2024-01-01',
                endDate: '2024-01-05',
                city: 'New York'
            });
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Trip limit exceeded');
            expect(res.body.upgradeRequired).toBe(true);
        });
        it('should block analytics access', async () => {
            const res = await request(app)
                .get('/api/analytics')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Analytics access not available');
            expect(res.body.upgradeRequired).toBe(true);
        });
        it('should block white label access', async () => {
            const res = await request(app)
                .post('/api/white-label/configure')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                companyName: 'Test Company',
                primaryColor: '#000000'
            });
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('White label access not available');
            expect(res.body.upgradeRequired).toBe(true);
        });
    });
    describe('Pro Plan Features', () => {
        beforeEach(async () => {
            // Upgrade organization to Pro plan
            await db.update(organizations)
                .set({ plan: 'pro' })
                .where(eq(organizations.id, orgId));
        });
        it('should allow analytics access', async () => {
            const res = await request(app)
                .get('/api/analytics')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('overview');
        });
        it('should allow white label access', async () => {
            const res = await request(app)
                .post('/api/white-label/configure')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                companyName: 'Test Company',
                primaryColor: '#000000'
            });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it('should have higher trip limits', async () => {
            // Clear existing trips
            await db.delete(trips).where(eq(trips.organization_id, orgId));
            // Should allow up to 100 trips for Pro plan
            const res = await request(app)
                .get('/api/subscription-status/limits/trips')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(100);
            expect(res.body.tier).toBe('pro');
        });
    });
    describe('Enterprise Plan Features', () => {
        beforeEach(async () => {
            // Upgrade organization to Enterprise plan
            await db.update(organizations)
                .set({ plan: 'enterprise' })
                .where(eq(organizations.id, orgId));
        });
        it('should have unlimited trip limits', async () => {
            const res = await request(app)
                .get('/api/subscription-status/limits/trips')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(-1); // Unlimited
            expect(res.body.tier).toBe('enterprise');
        });
        it('should have unlimited user limits', async () => {
            const res = await request(app)
                .get('/api/subscription-status/limits/users')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(-1); // Unlimited
            expect(res.body.tier).toBe('enterprise');
        });
    });
    describe('Subscription Status API', () => {
        it('should return comprehensive status', async () => {
            const res = await request(app)
                .get('/api/subscription-status')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('tier');
            expect(res.body).toHaveProperty('limits');
            expect(res.body).toHaveProperty('usage');
            expect(res.body.limits).toHaveProperty('maxTrips');
            expect(res.body.limits).toHaveProperty('maxUsers');
            expect(res.body.limits).toHaveProperty('whiteLabelAccess');
            expect(res.body.limits).toHaveProperty('analyticsAccess');
        });
    });
});
