/**
 * AI Integration Tests
 * Testing AI-powered features and OpenAI integration
 */
import request from 'supertest';
import { app } from '../server/test-app';
describe('AI Integration API', () => {
    let authCookies: string[] = [];
    let testUserId: number;
    beforeAll(async () => {
        // Create and authenticate test user
        const userData = {
            email: 'ai-test@example.com',
            password: 'password123',
            username: 'aiuser'
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
    describe('POST /api/ai/suggest-activities', () => {
        it('should generate AI activity suggestions', async () => {
            const requestData = {
                city: 'Paris',
                duration: 5,
                interests: ['culture', 'food', 'history']
            };
            const response = await request(app)
                .post('/api/ai/suggest-activities')
                .set('Cookie', authCookies)
                .send(requestData)
                .expect(200);
            expect(response.body).toHaveProperty('activities');
            expect(Array.isArray(response.body.activities)).toBe(true);
        });
        it('should require authentication for AI suggestions', async () => {
            const requestData = {
                city: 'London',
                duration: 3
            };
            await request(app)
                .post('/api/ai/suggest-activities')
                .send(requestData)
                .expect(401);
        });
        it('should validate request parameters', async () => {
            const invalidData = { city: '' };
            await request(app)
                .post('/api/ai/suggest-activities')
                .set('Cookie', authCookies)
                .send(invalidData)
                .expect(400);
        });
    });
    describe('POST /api/ai/find-location', () => {
        it('should search locations with AI enhancement', async () => {
            const searchData = {
                description: 'romantic restaurants near Eiffel Tower'
            };
            const response = await request(app)
                .post('/api/ai/find-location')
                .set('Cookie', authCookies)
                .send(searchData)
                .expect(200);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('address');
        });
        it('should require authentication for location search', async () => {
            const searchData = { description: 'museums in Rome' };
            await request(app)
                .post('/api/ai/find-location')
                .send(searchData)
                .expect(401);
        });
    });
    describe('POST /api/ai/optimize-itinerary', () => {
        it('should optimize trip itinerary using AI', async () => {
            const optimizeData = {
                activities: [
                    {
                        name: 'Louvre Museum',
                        location: 'Paris, France',
                        date: '2025-02-01',
                        time: '10:00',
                        duration: 180
                    },
                    {
                        name: 'Eiffel Tower',
                        location: 'Paris, France',
                        date: '2025-02-01',
                        time: '15:00',
                        duration: 120
                    }
                ],
                preferences: {
                    travelMode: 'walking',
                    maxTravelTime: 30,
                    prioritizeEfficiency: true
                }
            };
            const response = await request(app)
                .post('/api/ai/optimize-itinerary')
                .set('Cookie', authCookies)
                .send(optimizeData)
                .expect(200);
            expect(response.body).toHaveProperty('optimizedActivities');
            expect(response.body).toHaveProperty('improvements');
            expect(response.body).toHaveProperty('travelTime');
            expect(Array.isArray(response.body.optimizedActivities)).toBe(true);
        });
        it('should require authentication for itinerary optimization', async () => {
            const optimizeData = {
                activities: [],
                preferences: {}
            };
            await request(app)
                .post('/api/ai/optimize-itinerary')
                .send(optimizeData)
                .expect(401);
        });
    });
    describe('POST /api/ai/group-itinerary', () => {
        it('should generate a consensus itinerary', async () => {
            const requestData = {
                destination: 'Rome',
                start_date: '2025-06-01',
                end_date: '2025-06-05',
                preferences: [
                    { userId: 'u1', preferences: ['museums', 'pizza'] },
                    { userId: 'u2', preferences: ['pizza', 'shopping'] }
                ]
            };
            const response = await request(app)
                .post('/api/ai/group-itinerary')
                .set('Cookie', authCookies)
                .send(requestData)
                .expect(200);
            expect(response.body).toHaveProperty('itinerary');
            expect(response.body).toHaveProperty('priorityList');
        });
    });
});
