/**
 * End-to-End Integration Tests
 * Testing complete user workflows and system integrations
 */

import request from 'supertest';
import { getTestApp } from '../server/test-app';

describe('End-to-End Integration Tests', () => {
  let app: any;
  let authCookies: string[] = [];
  let testUserId: number;
  let organizationId: number;

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create and authenticate test user with organization
    const userData = {
      email: 'integration-test@example.com',
      password: 'password123',
      username: 'integrationuser',
      organizationName: 'Integration Test Corp'
    };

    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send(userData)
      .expect(201);

    testUserId = signupResponse.body.user.id;
    organizationId = signupResponse.body.user.organizationId;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    authCookies = Array.isArray(loginResponse.headers['set-cookie']) 
      ? loginResponse.headers['set-cookie'] 
      : loginResponse.headers['set-cookie'] ? [loginResponse.headers['set-cookie']] : [];
  });

  describe('Complete Travel Booking Workflow', () => {
    it('should complete a full travel booking workflow: login → flight search → trip creation', async () => {
      // Step 1: Verify user is authenticated
      const authCheckResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies)
        .expect(200);

      expect(authCheckResponse.body.email).toBe('integration-test@example.com');

      // Step 2: Search for flights
      const flightSearchData = {
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2024-04-15',
        returnDate: '2024-04-22',
        passengers: 1,
        cabin: 'economy'
      };

      const flightSearchResponse = await request(app)
        .post('/api/flights/search')
        .set('Cookie', authCookies)
        .send(flightSearchData)
        .expect(200);

      expect(flightSearchResponse.body).toHaveProperty('success', true);
      expect(flightSearchResponse.body.data).toHaveProperty('flights');
      expect(Array.isArray(flightSearchResponse.body.data.flights)).toBe(true);

      // Step 3: Create a trip based on search results
      const tripData = {
        title: 'Business Trip to London',
        description: 'Quarterly business review meeting',
        startDate: '2024-04-15',
        endDate: '2024-04-22',
        destination: 'London, UK',
        purpose: 'business',
        estimatedCost: 2500,
        flightDetails: {
          origin: flightSearchData.origin,
          destination: flightSearchData.destination,
          departureDate: flightSearchData.departureDate,
          returnDate: flightSearchData.returnDate
        }
      };

      const createTripResponse = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData)
        .expect(201);

      expect(createTripResponse.body).toHaveProperty('id');
      expect(createTripResponse.body.title).toBe(tripData.title);
      expect(createTripResponse.body.destination).toBe(tripData.destination);

      const tripId = createTripResponse.body.id;

      // Step 4: Verify trip was created and is accessible
      const getTripResponse = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(getTripResponse.body.id).toBe(tripId);
      expect(getTripResponse.body.title).toBe(tripData.title);

      // Step 5: Update trip status
      const updateTripResponse = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Cookie', authCookies)
        .send({
          status: 'pending_approval',
          notes: 'Submitted for manager approval'
        })
        .expect(200);

      expect(updateTripResponse.body.status).toBe('pending_approval');
    });

    it('should handle voice-assisted booking workflow', async () => {
      // Step 1: Start a voice session
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Step 2: Use voice command to search for flights
      const voiceCommand1 = {
        text: 'I need to book a flight from New York to Los Angeles next month',
        sessionId: sessionId
      };

      const voiceResponse1 = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(voiceCommand1)
        .expect(200);

      expect(voiceResponse1.body.success).toBe(true);
      expect(voiceResponse1.body.data).toHaveProperty('text');

      // Step 3: Follow up with more specific requirements
      const voiceCommand2 = {
        text: 'Make it for March 15th, returning March 20th, business class',
        sessionId: sessionId
      };

      const voiceResponse2 = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(voiceCommand2)
        .expect(200);

      expect(voiceResponse2.body.success).toBe(true);

      // Step 4: Confirm and create trip through voice
      const voiceCommand3 = {
        text: 'Yes, create the trip and call it "West Coast Sales Meeting"',
        sessionId: sessionId
      };

      const voiceResponse3 = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(voiceCommand3)
        .expect(200);

      expect(voiceResponse3.body.success).toBe(true);

      // Step 5: Verify the trip was created (may need to check trips list)
      const tripsResponse = await request(app)
        .get('/api/trips')
        .set('Cookie', authCookies)
        .expect(200);

      expect(Array.isArray(tripsResponse.body)).toBe(true);
      expect(tripsResponse.body.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics and Reporting Workflow', () => {
    let tripId: number;

    beforeAll(async () => {
      // Create some test data for analytics
      const tripData = {
        title: 'Analytics Test Trip',
        description: 'Trip for testing analytics',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        destination: 'Chicago',
        estimatedCost: 1800,
        status: 'completed'
      };

      const createTripResponse = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData)
        .expect(201);

      tripId = createTripResponse.body.id;
    });

    it('should generate analytics dashboard data', async () => {
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .set('Cookie', authCookies)
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('success', true);
      expect(analyticsResponse.body.data).toHaveProperty('totalTrips');
      expect(analyticsResponse.body.data).toHaveProperty('totalCost');
      expect(analyticsResponse.body.data).toHaveProperty('averageTripCost');
      expect(analyticsResponse.body.data).toHaveProperty('monthlySpending');
      expect(Array.isArray(analyticsResponse.body.data.monthlySpending)).toBe(true);
    });

    it('should generate custom reports', async () => {
      const reportRequest = {
        title: 'Q1 Travel Report',
        dateRange: {
          start: '2024-01-01',
          end: '2024-03-31'
        },
        groupBy: 'month',
        metrics: ['totalCost', 'tripCount', 'averageCost'],
        filters: {
          status: 'completed',
          purpose: 'business'
        }
      };

      const reportResponse = await request(app)
        .post('/api/custom-reporting/generate')
        .set('Cookie', authCookies)
        .send(reportRequest)
        .expect(200);

      expect(reportResponse.body).toHaveProperty('success', true);
      expect(reportResponse.body.data).toHaveProperty('reportId');
      expect(reportResponse.body.data).toHaveProperty('data');
      expect(reportResponse.body.data).toHaveProperty('chartConfig');
    });
  });

  describe('AI Assistant Integration', () => {
    it('should handle complex AI assistant queries', async () => {
      const assistantRequest = {
        query: 'What are my travel options for a business trip to San Francisco next week under $2000 budget?',
        context: {
          urgency: 'medium',
          timeZone: 'America/New_York'
        }
      };

      const assistantResponse = await request(app)
        .post('/api/ai-assistant/query')
        .set('Cookie', authCookies)
        .send(assistantRequest)
        .expect(200);

      expect(assistantResponse.body).toHaveProperty('success', true);
      expect(assistantResponse.body.data).toHaveProperty('response');
      expect(assistantResponse.body.data).toHaveProperty('suggestions');
      expect(assistantResponse.body.data).toHaveProperty('actionItems');
    });

    it('should check policy compliance for trip requests', async () => {
      const policyCheckRequest = {
        tripDetails: {
          destination: 'Tokyo, Japan',
          duration: 7,
          estimatedCost: 5000,
          class: 'business',
          purpose: 'conference'
        }
      };

      const policyResponse = await request(app)
        .post('/api/policies/check-compliance')
        .set('Cookie', authCookies)
        .send(policyCheckRequest)
        .expect(200);

      expect(policyResponse.body).toHaveProperty('success', true);
      expect(policyResponse.body.data).toHaveProperty('compliant');
      expect(policyResponse.body.data).toHaveProperty('violations');
      expect(policyResponse.body.data).toHaveProperty('recommendations');
    });
  });

  describe('Real-time Data Integration', () => {
    it('should provide real-time weather data', async () => {
      const weatherRequest = {
        location: 'London, UK',
        date: '2024-04-15'
      };

      const weatherResponse = await request(app)
        .post('/api/weather/forecast')
        .set('Cookie', authCookies)
        .send(weatherRequest)
        .expect(200);

      expect(weatherResponse.body).toHaveProperty('success', true);
      expect(weatherResponse.body.data).toHaveProperty('current');
      expect(weatherResponse.body.data).toHaveProperty('forecast');
    });

    it('should provide flight status information', async () => {
      const flightStatusRequest = {
        flightNumber: 'UA123',
        date: '2024-04-15'
      };

      const flightStatusResponse = await request(app)
        .post('/api/flights/status')
        .set('Cookie', authCookies)
        .send(flightStatusRequest)
        .expect(200);

      expect(flightStatusResponse.body).toHaveProperty('success', true);
      expect(flightStatusResponse.body.data).toHaveProperty('status');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid flight search parameters gracefully', async () => {
      const invalidSearchData = {
        origin: 'INVALID',
        destination: 'INVALID',
        departureDate: 'invalid-date',
        passengers: -1
      };

      const response = await request(app)
        .post('/api/flights/search')
        .set('Cookie', authCookies)
        .send(invalidSearchData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle trip creation with missing required fields', async () => {
      const invalidTripData = {
        // Missing required fields like title, startDate, etc.
        description: 'Incomplete trip data'
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(invalidTripData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle rate limiting on API endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/trips')
          .set('Cookie', authCookies)
      );

      const responses = await Promise.all(promises);

      // Most should succeed, but some might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount + rateLimitedCount).toBe(10);
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });
  });
});
