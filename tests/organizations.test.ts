/**
 * Organizations API Tests
 * Multi-tenant organization management testing
 */
import request from 'supertest';
import { app } from '../server/test-app';
describe('Organizations API', () => {
    let authCookies: string[] = [];
    let testUserId: number;
    let testOrgId: number;
    beforeAll(async () => {
        // Create and authenticate test user
        const userData = {
            email: 'org-test@example.com',
            password: 'password123',
            username: 'orguser'
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
        testOrgId = loginResponse.body.user.organizationId || 1;
    });
    describe('GET /api/organizations', () => {
        it('should retrieve user organization', async () => {
            const response = await request(app)
                .get('/api/organizations')
                .set('Cookie', authCookies)
                .expect(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('domain');
        });
        it('should require authentication for organization data', async () => {
            await request(app)
                .get('/api/organizations')
                .expect(401);
        });
    });
    describe('PUT /api/organizations/:id', () => {
        it('should update organization settings', async () => {
            const updateData = {
                name: 'Updated Organization Name',
                travelPolicies: {
                    maxTripBudget: 5000,
                    requiresApproval: true,
                    allowedDestinations: ['US', 'CA', 'EU']
                }
            };
            const response = await request(app)
                .put(`/api/organizations/${testOrgId}`)
                .set('Cookie', authCookies)
                .send(updateData)
                .expect(200);
            expect(response.body.name).toBe(updateData.name);
            expect(response.body.travelPolicies).toMatchObject(updateData.travelPolicies);
        });
        it('should reject unauthorized organization updates', async () => {
            const updateData = {
                name: 'Unauthorized Update'
            };
            await request(app)
                .put(`/api/organizations/${testOrgId}`)
                .send(updateData)
                .expect(401);
        });
    });
    describe('GET /api/organizations/members', () => {
        it('should retrieve organization members', async () => {
            const response = await request(app)
                .get('/api/organizations/members')
                .set('Cookie', authCookies)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('username');
            expect(response.body[0]).toHaveProperty('role');
        });
        it('should require authentication for member listing', async () => {
            await request(app)
                .get('/api/organizations/members')
                .expect(401);
        });
    });
});
