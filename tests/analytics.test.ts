/**
 * Analytics API Tests
 * Comprehensive analytics and reporting testing
 */
import request from 'supertest';
import { app } from '../server/test-app';
describe('Analytics API', () => {
    let authCookies: string[] = [];
    let testUserId: number;
    beforeAll(async () => {
        // Create and authenticate test user
        const userData = {
            email: 'analytics-test@example.com',
            password: 'password123',
            username: 'analyticsuser'
        };
        await request(app)
            .post('/api/auth/signup')
            .send(userData);
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
            email: userData.email,
            password: userData.password
        });
        const cookies = loginResponse.headers['set-cookie'];
        authCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
        testUserId = loginResponse.body.user.id;
    });
    describe('GET /api/analytics', () => {
        it('should retrieve analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics')
                .set('Cookie', authCookies)
                .expect(200);
            expect(response.body).toHaveProperty('overview');
            expect(response.body).toHaveProperty('destinations');
            expect(response.body).toHaveProperty('tripDurations');
            expect(response.body).toHaveProperty('userEngagement');
            expect(response.body).toHaveProperty('recentActivity');
            expect(response.body).toHaveProperty('growthMetrics');
            // Verify data structure
            expect(response.body.overview).toHaveProperty('totalTrips');
            expect(response.body.overview).toHaveProperty('totalUsers');
            expect(response.body.overview).toHaveProperty('totalActivities');
            expect(Array.isArray(response.body.destinations)).toBe(true);
            expect(Array.isArray(response.body.growthMetrics)).toBe(true);
        });
        it('should require authentication for analytics data', async () => {
            await request(app)
                .get('/api/analytics')
                .expect(401);
        });
    });
    describe('GET /api/analytics/personal', () => {
        it('should retrieve personal analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics/personal')
                .set('Cookie', authCookies)
                .expect(200);
            expect(response.body).toHaveProperty('overview');
            expect(response.body).toHaveProperty('userEngagement');
            expect(response.body).toHaveProperty('recentActivity');
        });
        it('should require authentication for personal analytics', async () => {
            await request(app)
                .get('/api/analytics/personal')
                .expect(401);
        });
    });
    describe('GET /api/analytics/export/csv', () => {
        it('should export analytics data as CSV', async () => {
            const response = await request(app)
                .get('/api/analytics/export/csv')
                .set('Cookie', authCookies)
                .expect(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });
        it('should require authentication for analytics export', async () => {
            await request(app)
                .get('/api/analytics/export/csv')
                .expect(401);
        });
    });
});
