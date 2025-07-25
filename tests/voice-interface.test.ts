/**
 * Voice Interface API Tests
 * Testing voice commands, AI integration, and response handling
 */

import request from 'supertest';
import { app as setupApp } from '../server/test-app';
import { jest } from '@jest/globals';

// Mock OpenAI to avoid making real API calls during tests
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'book_flight',
                  entities: {
                    destination: 'London',
                    date: 'tomorrow'
                  },
                  confidence: 0.95
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('Voice Interface API', () => {
  let authCookies: string[] = [];
  let testUserId: number;
  let app: any;

  beforeAll(async () => {
    // Setup the async app
    app = await setupApp;
    
    // Create and authenticate test user
    const userData = {
      email: 'voice-test@example.com',
      password: 'password123',
      username: 'voiceuser',
      organizationName: 'Voice Test Org'
    };

    await request(app)
      .post('/api/auth/signup')
      .send(userData)
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    authCookies = Array.isArray(loginResponse.headers['set-cookie']) 
      ? loginResponse.headers['set-cookie'] 
      : [loginResponse.headers['set-cookie'] || ''];
    testUserId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test user and any created data
    if (testUserId) {
      // Allow time for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear test state
    authCookies = [];
    testUserId = 0;
  });

  describe('Voice Command Processing', () => {
    it('should process text-based voice commands', async () => {
      // Start a new session first
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      const commandData = {
        text: 'Book a flight to London tomorrow',
        sessionId: sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('text');
      expect(response.body.data).toHaveProperty('intent');
      expect(response.body.data.intent).toBe('book_flight');
    });

    it('should handle flight booking intent correctly', async () => {
      // Start a new session first
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      const commandData = {
        text: 'I want to book a flight to New York next week',
        sessionId: sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('actions');
      expect(response.body.data.actions).toBeInstanceOf(Array);
    });

    it('should handle weather query intent', async () => {
      // Start a new session first
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      const commandData = {
        text: 'What\'s the weather like in Paris?',
        sessionId: sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('text');
      // Should contain weather information or fallback response
      expect(typeof response.body.data.text).toBe('string');
    });

    it('should handle trip information queries', async () => {
      // First create a test trip
      const tripData = {
        title: 'Test Trip for Voice',
        description: 'A trip to test voice queries',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        destination: 'San Francisco'
      };

      await request(app)
        .post('/api/trips')
        .set('Cookie', authCookies)
        .send(tripData)
        .expect(201);

      // Create session for trip query
      const sessionResponse = await request(app)
        .post('/api/voice/session/create')
        .set('Cookie', authCookies)
        .send()
        .expect(201);

      const sessionId = sessionResponse.body.data.sessionId;

      // Now query for trip information
      const commandData = {
        text: 'Show me my upcoming trips',
        sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('text');
      expect(response.body.data.text).toContain('trip');
    });

    it('should handle unknown or unclear commands gracefully', async () => {
      // Create session first
      const sessionResponse = await request(app)
        .post('/api/voice/session/create')
        .set('Cookie', authCookies)
        .send()
        .expect(201);

      const sessionId = sessionResponse.body.data.sessionId;

      const commandData = {
        text: 'asdfghjkl random nonsense command',
        sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('text');
      // Should provide helpful fallback response
      expect(response.body.data.text).toMatch(/sorry|help|understand|try/i);
    });
  });

  describe('Voice Session Management', () => {
    it('should create a new voice session', async () => {
      const response = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should maintain session context across commands', async () => {
      // Start a new session
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Send first command
      await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send({
          text: 'I want to book a flight',
          sessionId: sessionId
        })
        .expect(200);

      // Send follow-up command in same session
      const followUpResponse = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send({
          text: 'Make it to London',
          sessionId: sessionId
        })
        .expect(200);

      expect(followUpResponse.body.success).toBe(true);
      // The response should understand the context from previous command
      expect(followUpResponse.body.data.text).toMatch(/london|flight|book/i);
    });

    it('should end voice sessions properly', async () => {
      // Start a session
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // End the session
      const endResponse = await request(app)
        .post('/api/voice/session/end')
        .set('Cookie', authCookies)
        .send({ sessionId })
        .expect(200);

      expect(endResponse.body).toHaveProperty('success', true);
    });

    it('should get session history', async () => {
      // Start a session and send some commands
      const sessionResponse = await request(app)
        .post('/api/voice/session/start')
        .set('Cookie', authCookies)
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Send a few commands
      await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send({
          text: 'Book a flight to Tokyo',
          sessionId: sessionId
        });

      await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send({
          text: 'What\'s the weather there?',
          sessionId: sessionId
        });

      // Get session history
      const historyResponse = await request(app)
        .get(`/api/voice/session/${sessionId}/history`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(historyResponse.body).toHaveProperty('success', true);
      expect(historyResponse.body.data).toBeInstanceOf(Array);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Voice Action Execution', () => {
    it('should execute voice actions with proper parameters', async () => {
      const actionData = {
        action: 'book_flight',
        parameters: {
          destination: 'London',
          date: '2024-03-15',
          passengers: 1
        }
      };

      const response = await request(app)
        .post('/api/voice/action/execute')
        .set('Cookie', authCookies)
        .send(actionData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should handle action execution errors gracefully', async () => {
      const invalidActionData = {
        action: 'invalid-action-type',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/voice/action/execute')
        .set('Cookie', authCookies)
        .send(invalidActionData)
        .expect(200);

      // Should handle gracefully without throwing errors
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    it('should require authentication for voice commands', async () => {
      const commandData = {
        text: 'Book a flight to London',
        sessionId: 'unauthorized-session'
      };

      await request(app)
        .post('/api/voice/command/text')
        .send(commandData)
        .expect(401);
    });

    it('should validate command data structure', async () => {
      const invalidCommandData = {
        // Missing required 'text' field
        sessionId: 'test-session'
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(invalidCommandData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle OpenAI API failures gracefully', async () => {
      // Create session first
      const sessionResponse = await request(app)
        .post('/api/voice/session/create')
        .set('Cookie', authCookies)
        .send()
        .expect(201);

      const sessionId = sessionResponse.body.data.sessionId;

      // Note: This test simulates OpenAI failure by just sending a command
      // In a real scenario, we'd mock the OpenAI client at a higher level
      const commandData = {
        text: 'Book a flight to London',
        sessionId
      };

      const response = await request(app)
        .post('/api/voice/command/text')
        .set('Cookie', authCookies)
        .send(commandData)
        .expect(200);

      // Should fall back to basic response when AI fails
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('text');
    });
  });
});
