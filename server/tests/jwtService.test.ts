import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { jwtService } from '../utils/jwtService';

// Mock Redis client
jest.mock('../utils/redis', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('JWT Service', () => {
  const userId = 'user-123';
  const email = 'test@example.com';
  const role = 'user';
  const organizationId = 42;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate an access token', async () => {
      const result = await jwtService.generateToken(userId, email, 'access', { role });
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.jti).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate a refresh token and add it to whitelist', async () => {
      const result = await jwtService.generateToken(userId, email, 'refresh', { role });
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.jti).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      
      // Check if token was added to whitelist
      const redisClient = require('../utils/redis').redisClient;
      expect(redisClient.set).toHaveBeenCalled();
    });

    it('should generate auth tokens with organization ID', async () => {
      const result = await jwtService.generateAuthTokens(userId, email, role, organizationId);
      
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.tokenType).toBe('Bearer');
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid token', async () => {
      // Generate a token first
      const { token } = await jwtService.generateToken(userId, email, 'access', { role });
      
      // Verify the token
      const result = await jwtService.verifyToken(token, 'access');
      
      expect(result).toBeDefined();
      expect(result?.expired).toBe(false);
      expect(result?.payload).toBeDefined();
      expect(result?.payload.userId).toBe(userId);
      expect(result?.payload.email).toBe(email);
      expect(result?.payload.role).toBe(role);
    });

    it('should detect token type mismatch', async () => {
      // Generate an access token
      const { token } = await jwtService.generateToken(userId, email, 'access', { role });
      
      // Try to verify it as a refresh token
      const result = await jwtService.verifyToken(token, 'refresh');
      
      expect(result).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh an access token using a valid refresh token', async () => {
      // Generate auth tokens
      const initialTokens = await jwtService.generateAuthTokens(userId, email, role);
      
      // Mock the whitelist check to return true
      const redisClient = require('../utils/redis').redisClient;
      redisClient.get.mockResolvedValueOnce(userId);
      
      // Refresh the token
      const refreshedTokens = await jwtService.refreshAccessToken(initialTokens.refreshToken);
      
      expect(refreshedTokens).toBeDefined();
      expect(refreshedTokens?.accessToken).toBeDefined();
      expect(refreshedTokens?.refreshToken).toBeDefined();
      expect(refreshedTokens?.accessToken).not.toBe(initialTokens.accessToken);
      expect(refreshedTokens?.refreshToken).not.toBe(initialTokens.refreshToken);
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a token by adding it to blacklist', async () => {
      const tokenId = 'token-123';
      await jwtService.revokeToken(tokenId);
      
      const redisClient = require('../utils/redis').redisClient;
      expect(redisClient.set).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should check if a token is blacklisted', async () => {
      const tokenId = 'token-123';
      
      // Mock token being blacklisted
      const redisClient = require('../utils/redis').redisClient;
      redisClient.get.mockResolvedValueOnce('1');
      
      const isBlacklisted = await jwtService.isTokenBlacklisted(tokenId);
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('Password Reset', () => {
    it('should generate a password reset token', async () => {
      const result = await jwtService.generatePasswordResetToken(userId, email);
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should verify a valid password reset token', async () => {
      // Generate a password reset token
      const { token } = await jwtService.generatePasswordResetToken(userId, email);
      
      // Verify the token
      const result = await jwtService.verifyPasswordResetToken(token);
      
      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(email);
      expect(result?.jti).toBeDefined();
    });
  });
});
