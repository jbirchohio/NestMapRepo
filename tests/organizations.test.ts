/**
 * Organization Management API Tests
 * Multi-tenant isolation and organization access control testing
 */

import request from 'supertest';
import { getTestApp } from '../server/test-app';

describe('Organization Management API', () => {
  let app: any;
  let org1AuthCookies: string[] = [];
  let org2AuthCookies: string[] = [];
  let org1UserId: number;
  let org2UserId: number;
  let org1Id: number;
  let org2Id: number;

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create first organization and user
    const org1UserData = {
      email: 'org1-admin@example.com',
      password: 'password123',
      username: 'org1admin',
      organizationName: 'Test Organization 1'
    };

    const org1SignupResponse = await request(app)
      .post('/api/auth/signup')
      .send(org1UserData)
      .expect(201);

    org1UserId = org1SignupResponse.body.user.id;
    org1Id = org1SignupResponse.body.user.organizationId;

    const org1LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: org1UserData.email,
        password: org1UserData.password
      })
      .expect(200);

    org1AuthCookies = org1LoginResponse.headers['set-cookie'];

    // Create second organization and user
    const org2UserData = {
      email: 'org2-admin@example.com',
      password: 'password123',
      username: 'org2admin',
      organizationName: 'Test Organization 2'
    };

    const org2SignupResponse = await request(app)
      .post('/api/auth/signup')
      .send(org2UserData)
      .expect(201);

    org2UserId = org2SignupResponse.body.user.id;
    org2Id = org2SignupResponse.body.user.organizationId;

    const org2LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: org2UserData.email,
        password: org2UserData.password
      })
      .expect(200);

    org2AuthCookies = org2LoginResponse.headers['set-cookie'];
  });

  describe('Organization Data Isolation', () => {
    it('should enforce organization access control for trips', async () => {
      // Create a trip for organization 1
      const org1TripData = {
        title: 'Org 1 Secret Trip',
        description: 'This should only be visible to org 1',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        destination: 'New York'
      };

      const createTripResponse = await request(app)
        .post('/api/trips')
        .set('Cookie', org1AuthCookies)
        .send(org1TripData)
        .expect(201);

      const tripId = createTripResponse.body.id;

      // Organization 1 should be able to access their trip
      await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', org1AuthCookies)
        .expect(200);

      // Organization 2 should NOT be able to access org 1's trip
      await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Cookie', org2AuthCookies)
        .expect(404); // Should return 404 or 403, not the actual trip
    });

    it('should only return trips belonging to the user\'s organization', async () => {
      // Create trips for both organizations
      const org1TripData = {
        title: 'Org 1 Trip',
        description: 'Organization 1 trip',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        destination: 'Boston'
      };

      const org2TripData = {
        title: 'Org 2 Trip',
        description: 'Organization 2 trip',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        destination: 'Seattle'
      };

      await request(app)
        .post('/api/trips')
        .set('Cookie', org1AuthCookies)
        .send(org1TripData)
        .expect(201);

      await request(app)
        .post('/api/trips')
        .set('Cookie', org2AuthCookies)
        .send(org2TripData)
        .expect(201);

      // Organization 1 should only see their trips
      const org1TripsResponse = await request(app)
        .get('/api/trips')
        .set('Cookie', org1AuthCookies)
        .expect(200);

      const org1Trips = org1TripsResponse.body;
      expect(Array.isArray(org1Trips)).toBe(true);
      
      // All trips should belong to organization 1
      org1Trips.forEach((trip: any) => {
        expect(trip.title).toContain('Org 1');
      });

      // Organization 2 should only see their trips
      const org2TripsResponse = await request(app)
        .get('/api/trips')
        .set('Cookie', org2AuthCookies)
        .expect(200);

      const org2Trips = org2TripsResponse.body;
      expect(Array.isArray(org2Trips)).toBe(true);
      
      // All trips should belong to organization 2
      org2Trips.forEach((trip: any) => {
        expect(trip.title).toContain('Org 2');
      });
    });

    it('should prevent cross-organization user access', async () => {
      // Organization 1 user should not be able to access organization 2's details
      await request(app)
        .get(`/api/organizations/${org2Id}`)
        .set('Cookie', org1AuthCookies)
        .expect(403);

      // Organization 2 user should not be able to access organization 1's details
      await request(app)
        .get(`/api/organizations/${org1Id}`)
        .set('Cookie', org2AuthCookies)
        .expect(403);
    });
  });

  describe('Organization Management', () => {
    it('should allow organization admin to view their organization details', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org1Id}`)
        .set('Cookie', org1AuthCookies)
        .expect(200);

      expect(response.body).toHaveProperty('id', org1Id);
      expect(response.body).toHaveProperty('name', 'Test Organization 1');
    });

    it('should allow organization admin to update their organization settings', async () => {
      const updateData = {
        name: 'Updated Test Organization 1',
        settings: {
          maxTripDuration: 30,
          requireApproval: true,
          budgetLimit: 10000
        }
      };

      const response = await request(app)
        .put(`/api/organizations/${org1Id}`)
        .set('Cookie', org1AuthCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Test Organization 1');
      expect(response.body.settings.maxTripDuration).toBe(30);
    });

    it('should prevent unauthorized organization updates', async () => {
      const updateData = {
        name: 'Hacked Organization Name'
      };

      // Organization 2 user should not be able to update organization 1
      await request(app)
        .put(`/api/organizations/${org1Id}`)
        .set('Cookie', org2AuthCookies)
        .send(updateData)
        .expect(403);
    });
  });

  describe('User Management within Organizations', () => {
    it('should allow organization admin to invite users to their organization', async () => {
      const inviteData = {
        email: 'newuser@org1.com',
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/organizations/${org1Id}/invite`)
        .set('Cookie', org1AuthCookies)
        .send(inviteData)
        .expect(201);

      expect(response.body).toHaveProperty('email', inviteData.email);
      expect(response.body).toHaveProperty('organizationId', org1Id);
    });

    it('should prevent cross-organization user invitations', async () => {
      const inviteData = {
        email: 'hacker@malicious.com',
        role: 'admin'
      };

      // Organization 2 user should not be able to invite users to organization 1
      await request(app)
        .post(`/api/organizations/${org1Id}/invite`)
        .set('Cookie', org2AuthCookies)
        .send(inviteData)
        .expect(403);
    });
  });
});
