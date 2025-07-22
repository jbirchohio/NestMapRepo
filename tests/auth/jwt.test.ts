import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Enable verbose logging for debugging
console.debug = jest.fn();

// Mock the modules before importing the code under test
const mockSign = jest.fn();

// Mock the jsonwebtoken module
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: mockSign },
  sign: mockSign
}));

// Mock the logger
jest.mock('../../server/src/utils/logger', () => ({
  error: jest.fn().mockImplementation(console.error)
}));

// Import the function to test after setting up mocks
import { generateToken } from '../../server/src/auth/jwt';

describe('JWT Utility', () => {
  const mockUserId = '123';
  const mockEmail = 'test@example.com';
  const mockRole = 'user';

  beforeEach(() => {
    console.debug('=== Resetting mocks ===');
    jest.clearAllMocks();
    
    // Default mock implementation
    mockSign.mockImplementation((payload, secret, options, callback) => {
      console.debug('mockSign called with:', { payload, options });
      if (typeof callback === 'function') {
        console.debug('Calling callback with success');
        process.nextTick(() => {
          callback(null, 'mocked.jwt.token');
        });
      }
      return 'mocked.jwt.token';
    });

    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
  });

  it('should generate a JWT token', async () => {
    console.debug('=== Starting test: should generate a JWT token ===');
    
    // Call the function
    console.debug('Calling generateToken...');
    const token = await generateToken({
      sub: mockUserId,
      email: mockEmail,
      role: mockRole,
      type: 'access' as const
    });

    console.debug('Token generated:', token);
    
    // Verify the token is returned
    expect(token).toBe('mocked.jwt.token');
    
    // Verify sign was called with the correct arguments
    expect(mockSign).toHaveBeenCalled();
    
    const call = mockSign.mock.calls[0];
    expect(call[0]).toMatchObject({
      sub: mockUserId,
      email: mockEmail,
      role: mockRole,
      type: 'access',
      jti: expect.any(String)
    });
    
    expect(call[1]).toBe(process.env.JWT_SECRET || 'your-secret-key');
    
    expect(call[2]).toMatchObject({
      issuer: expect.any(String),
      audience: expect.any(String),
      algorithm: 'HS256',
      expiresIn: '15m'
    });
    
    expect(typeof call[3]).toBe('function'); // callback
  });

  it('should reject if token generation fails', async () => {
    console.debug('=== Starting test: should reject if token generation fails ===');
    
    // Setup the mock to fail
    const error = new Error('Token generation failed');
    mockSign.mockImplementationOnce((payload, secret, options, callback) => {
      console.debug('Failing mockSign called');
      if (typeof callback === 'function') {
        process.nextTick(() => {
          console.debug('Calling callback with error');
          callback(error);
        });
      }
      return 'mocked.jwt.token';
    });

    console.debug('Calling generateToken with failing mock...');
    await expect(
      generateToken({
        sub: mockUserId,
        email: mockEmail,
        role: mockRole,
        type: 'access' as const
      })
    ).rejects.toThrow('Token generation failed');
    
    console.debug('Test completed');
  });
});
