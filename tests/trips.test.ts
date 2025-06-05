/**
 * Trip Management API Tests
 * Comprehensive CRUD operations testing
 */

import request from 'supertest';
import { app } from '../server/test-app';

describe('Trip Management API', () => {
  let authCookies: string[] = [];
  let testUserId: number;

  beforeAll(async () => {
    // Create and authenticate test user
    const userData = {
      email: 'trip-test@example.com',
      password: 'password123',
      username: 'tripuser'
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

  describe('POST /api/trips', () => {
    it('should create a new trip successfully', async () => {
      const tripData = {
        name: 'Test Business Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        destination: 'New York, NY',
        budget: 2500,
        description: 'Client meeting and conference',
        isPublic: false
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(tripData.name);
      expect(response.body.destination).toBe(tripData.destination);
      expect(response.body.budget).toBe(tripData.budget);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should reject trip creation without authentication', async () => {
      const tripData = {
        name: 'Unauthorized Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        destination: 'Paris, France'
      };

      await request(app)
        .post('/api/trips')
        .send(tripData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidTripData = {
        name: '',
        startDate: '2025-02-01'
        // Missing endDate and destination
      };

      await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(invalidTripData)
        .expect(400);
    });
  });

  describe('GET /api/trips', () => {
    it('should retrieve user trips', async () => {
      const response = await request(app)
        .get('/api/trips')
        .set('Cookie', authCookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should require authentication for trip listing', async () => {
      await request(app)
        .get('/api/trips')
        .expect(401);
    });
  });

  describe('GET /api/trips/:id', () => {
    let tripId: number;

    beforeAll(async () => {
      const tripData = {
        name: 'Detail Test Trip',
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        destination: 'London, UK',
        budget: 3000
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData);

      tripId = response.body.id;
    });

    it('should retrieve trip details', async () => {
      const response = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body.id).toBe(tripId);
      expect(response.body.name).toBe('Detail Test Trip');
      expect(response.body.destination).toBe('London, UK');
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app)
        .get('/api/trips/99999')
        .set('Cookie', authCookies)
        .expect(404);
    });
  });

  describe('PUT /api/trips/:id', () => {
    let tripId: number;

    beforeAll(async () => {
      const tripData = {
        name: 'Update Test Trip',
        startDate: '2025-04-01',
        endDate: '2025-04-05',
        destination: 'Tokyo, Japan',
        budget: 4000
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData);

      tripId = response.body.id;
    });

    it('should update trip successfully', async () => {
      const updateData = {
        name: 'Updated Business Trip',
        budget: 4500,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.budget).toBe(updateData.budget);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should reject unauthorized updates', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      await request(app)
        .put(`/api/trips/${tripId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/trips/:id', () => {
    let tripId: number;

    beforeEach(async () => {
      const tripData = {
        name: 'Delete Test Trip',
        startDate: '2025-05-01',
        endDate: '2025-05-05',
        destination: 'Berlin, Germany',
        budget: 2000
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData);

      tripId = response.body.id;
    });

    it('should delete trip successfully', async () => {
      await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .expect(200);

      // Verify trip is deleted
      await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .expect(404);
    });

    it('should reject unauthorized deletion', async () => {
      await request(app)
        .delete(`/api/trips/${tripId}`)
        .expect(401);
    });
  });
});