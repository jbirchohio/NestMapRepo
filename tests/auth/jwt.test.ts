import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the jsonwebtoken module
const mockSign = jest.fn();
const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  sign: mockSign,
  verify: mockVerify
}));

// Mock the logger
const mockLogger = {
  error: jest.fn().mockImplementation(console.error),
  info: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../server/src/utils/logger', () => ({
  default: mockLogger,
  __esModule: true
}));

// Import the function to test after setting up mocks
import { generateToken, TokenType, verifyToken } from '../../server/src/auth/jwt';

describe('JWT Utils', () => {
  const testPayload = { userId: '123', email: 'test@example.com', type: 'access' as TokenType };
  const testToken = 'test.jwt.token';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSign.mockImplementation((payload, secret, options) => {
      return testToken;
    });
    
    mockVerify.mockImplementation((token, secret) => {
      return {
        ...testPayload,
        type: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
    });
  });

  describe('generateToken', () => {
    it('should generate a token with default expiration', () => {
      const token = generateToken(testPayload);
      
      expect(token).toBe(testToken);
      expect(mockSign).toHaveBeenCalledWith(
        testPayload,
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
    });

    it('should generate a token with custom expiration', () => {
      const token = generateToken(testPayload, '2h');
      
      expect(token).toBe(testToken);
      expect(mockSign).toHaveBeenCalledWith(
        testPayload,
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload = await verifyToken(testToken, (process.env.JWT_SECRET || 'default-secret') as TokenType);
      
      expect(payload).toEqual({
        ...testPayload,
        exp: expect.any(Number)
      });
      expect(mockVerify).toHaveBeenCalledWith(
        testToken,
        process.env.JWT_SECRET
      );
    });

    it('should handle token verification errors', async () => {
      const error = new Error('Invalid token');
      mockVerify.mockImplementationOnce(() => {
        throw error;
      });
      
      await expect(verifyToken('invalid-token', (process.env.JWT_SECRET || 'default-secret') as TokenType)).rejects.toThrow('Invalid token');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error verifying token:',
        expect.any(Error)
      );
    });
  });
});
