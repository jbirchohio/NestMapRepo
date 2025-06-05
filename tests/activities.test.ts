/**
 * Activities API Tests
 * Comprehensive activity management testing
 */

import request from 'supertest';
import { app } from '../server/test-app';

describe('Activities API', () => {
  let authCookies: string[] = [];
  let testUserId: number;
  let testTripId: number;

  beforeAll(async () => {
    // Create and authenticate test user
    const userData = {
      email: 'activity-test@example.com',
      password: 'password123',
      username: 'activityuser'
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

    // Create a test trip for activities
    const tripResponse = await request(app)
      .post('/api/trips')
      .set('Cookie', authCookies)
      .send({
        name: 'Activity Test Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        destination: 'San Francisco, CA',
        budget: 3000
      });

    testTripId = tripResponse.body.id;
  });

  describe('POST /api/activities', () => {
    it('should create a new activity successfully', async () => {
      const activityData = {
        tripId: testTripId,
        name: 'Golden Gate Bridge Visit',
        date: '2025-02-02',
        time: '10:00',
        duration: 120,
        location: 'Golden Gate Bridge, San Francisco, CA',
        description: 'Scenic photography and sightseeing',
        category: 'sightseeing',
        estimatedCost: 25
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Cookie', authCookies)
        .send(activityData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(activityData.name);
      expect(response.body.tripId).toBe(testTripId);
      expect(response.body.location).toBe(activityData.location);
    });

    it('should reject activity creation without authentication', async () => {
      const activityData = {
        tripId: testTripId,
        name: 'Unauthorized Activity',
        date: '2025-02-02',
        time: '14:00'
      };

      await request(app)
        .post('/api/activities')
        .send(activityData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidActivityData = {
        tripId: testTripId,
        name: '',
        // Missing required date
      };

      await request(app)
        .post('/api/activities')
        .set('Cookie', authCookies)
        .send(invalidActivityData)
        .expect(400);
    });
  });

  describe('GET /api/activities/trip/:trip_id', () => {
    it('should retrieve activities for a trip', async () => {
      const response = await request(app)
        .get(`/api/activities/trip/${testTripId}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should require authentication for activity listing', async () => {
      await request(app)
        .get(`/api/activities/trip/${testTripId}`)
        .expect(401);
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app)
        .get('/api/activities/trip/99999')
        .set('Cookie', authCookies)
        .expect(404);
    });
  });

  describe('PUT /api/activities/:id', () => {
    let activityId: number;

    beforeAll(async () => {
      const activityData = {
        tripId: testTripId,
        name: 'Update Test Activity',
        date: '2025-02-03',
        time: '15:00',
        location: 'Fisherman\'s Wharf, San Francisco, CA'
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Cookie', authCookies)
        .send(activityData);

      activityId = response.body.id;
    });

    it('should update activity successfully', async () => {
      const updateData = {
        name: 'Updated Golden Gate Activity',
        duration: 180,
        estimatedCost: 35,
        description: 'Extended visit with photography workshop'
      };

      const response = await request(app)
        .put(`/api/activities/${activityId}`)
        .set('Cookie', authCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.duration).toBe(updateData.duration);
      expect(response.body.estimatedCost).toBe(updateData.estimatedCost);
    });

    it('should reject unauthorized updates', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      await request(app)
        .put(`/api/activities/${activityId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    let activityId: number;

    beforeEach(async () => {
      const activityData = {
        tripId: testTripId,
        name: 'Delete Test Activity',
        date: '2025-02-04',
        time: '12:00',
        location: 'Lombard Street, San Francisco, CA'
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Cookie', authCookies)
        .send(activityData);

      activityId = response.body.id;
    });

    it('should delete activity successfully', async () => {
      await request(app)
        .delete(`/api/activities/${activityId}`)
        .set('Cookie', authCookies)
        .expect(200);

      // Verify activity is deleted by checking trip activities
      const response = await request(app)
        .get(`/api/activities/trip/${testTripId}`)
        .set('Cookie', authCookies);

      const deletedActivity = response.body.find((a: any) => a.id === activityId);
      expect(deletedActivity).toBeUndefined();
    });

    it('should reject unauthorized deletion', async () => {
      await request(app)
        .delete(`/api/activities/${activityId}`)
        .expect(401);
    });
  });
});