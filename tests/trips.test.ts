/**
 * Trip Management API Tests
 * Comprehensive CRUD operations testing
 */

import request from 'supertest';
import { getTestApp } from '../server/test-app';

describe('Trip Management API', () => {
  let app: any;
  let authCookies: string[] = [];
  let testUserId: number;

  beforeAll(async () => {
    app = await getTestApp();
    
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
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];
    authCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    testUserId = parseInt(loginResponse.body.user.id);
  });

  describe('POST /api/trips', () => {
    it('should create a new trip successfully', async () => {
      const tripData = {
        title: 'Test Business Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        destination: 'New York, NY',
        description: 'Client meeting and conference',
        isPublic: false
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(tripData.title);
      expect(response.body.destination).toBe(tripData.destination);
      expect(response.body.userId).toBe(testUserId);
    });

    it('should reject trip creation without authentication', async () => {
      const tripData = {
        title: 'Unauthorized Trip',
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
        title: '',
        startDate: '2025-02-01'
        // Missing endDate
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
        title: 'Detail Test Trip',
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        destination: 'London, UK'
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
      expect(response.body.title).toBe('Detail Test Trip');
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
        title: 'Update Test Trip',
        startDate: '2025-04-01',
        endDate: '2025-04-05',
        destination: 'Tokyo, Japan'
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData);

      tripId = response.body.id;
    });

    it('should update trip successfully', async () => {
      const updateData = {
        title: 'Updated Business Trip',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should reject unauthorized updates', async () => {
      const updateData = {
        title: 'Unauthorized Update'
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
        title: 'Delete Test Trip',
        startDate: '2025-05-01',
        endDate: '2025-05-05',
        destination: 'Berlin, Germany'
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