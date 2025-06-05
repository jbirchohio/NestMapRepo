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

  describe('POST /api/ai/trip-suggestions', () => {
    it('should generate AI trip suggestions', async () => {
      const requestData = {
        destination: 'Paris, France',
        duration: 5,
        budget: 3000,
        interests: ['culture', 'food', 'history'],
        travelStyle: 'leisure'
      };

      const response = await request(app)
        .post('/api/ai/trip-suggestions')
        .set('Cookie', authCookies)
        .send(requestData)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body).toHaveProperty('itinerary');
      expect(response.body).toHaveProperty('estimatedCost');
    });

    it('should require authentication for AI suggestions', async () => {
      const requestData = {
        destination: 'London, UK',
        duration: 3,
        budget: 2000
      };

      await request(app)
        .post('/api/ai/trip-suggestions')
        .send(requestData)
        .expect(401);
    });

    it('should validate request parameters', async () => {
      const invalidData = {
        destination: '',
        duration: 0
      };

      await request(app)
        .post('/api/ai/trip-suggestions')
        .set('Cookie', authCookies)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/ai/location-search', () => {
    it('should search locations with AI enhancement', async () => {
      const searchData = {
        query: 'romantic restaurants near Eiffel Tower',
        city: 'Paris',
        category: 'restaurant'
      };

      const response = await request(app)
        .post('/api/ai/location-search')
        .set('Cookie', authCookies)
        .send(searchData)
        .expect(200);

      expect(response.body).toHaveProperty('locations');
      expect(Array.isArray(response.body.locations)).toBe(true);
      expect(response.body).toHaveProperty('searchContext');
    });

    it('should require authentication for location search', async () => {
      const searchData = {
        query: 'museums in Rome',
        city: 'Rome'
      };

      await request(app)
        .post('/api/ai/location-search')
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
});