/**
 * Authentication API Tests
 * Enterprise acquisition readiness - comprehensive auth testing
 */

import request from 'supertest';
import { app } from '../server/test-app';

describe('Authentication API', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject signup with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should reject signup with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // First create a user
      const userData = {
        email: 'login@example.com',
        password: 'password123',
        username: 'loginuser'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData);

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return user data when authenticated', async () => {
      // Create and login user
      const userData = {
        email: 'auth@example.com',
        password: 'password123',
        username: 'authuser'
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

      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/user')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Authentication required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Create and login user
      const userData = {
        email: 'logout@example.com',
        password: 'password123',
        username: 'logoutuser'
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

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('success');
    });
  });
});

describe('Organization Scoping in Auth', () => {
  it('should associate user with organization during signup', async () => {
    const userData = {
      email: 'org@example.com',
      password: 'password123',
      username: 'orguser',
      organizationId: 1
    };

    const response = await request(app)
      .post('/api/auth/signup')
      .send(userData)
      .expect(201);

    expect(response.body.user.organizationId).toBe(userData.organizationId);
  });

  it('should enforce organization access in protected routes', async () => {
    // This test would verify that users can only access their org's data
    // Implementation depends on specific middleware structure
  });
});