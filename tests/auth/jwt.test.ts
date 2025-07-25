import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Simple test for JWT Utils that doesn't require mocking
import { jwtUtils } from '../../server/src/utils/jwt';

describe('JWT Utils', () => {
  const testPayload = { userId: '123', email: 'test@example.com', type: 'access' };
  const testSecret = process.env.JWT_SECRET || 'test-secret-key';

  describe('integration tests', () => {
    it('should sign and verify a token', async () => {
      const token = await jwtUtils.sign(testPayload, testSecret);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      const payload = await jwtUtils.verify(token, testSecret);
      expect(payload).toMatchObject({
        userId: testPayload.userId,
        email: testPayload.email,
        type: testPayload.type
      });
    });

    it('should handle verification errors', async () => {
      await expect(jwtUtils.verify('invalid-token', testSecret)).rejects.toThrow();
    });

    it('should decode tokens without verification', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.invalid';
      const decoded = jwtUtils.decode(testToken);
      expect(decoded).toMatchObject({
        userId: "123",
        email: "test@example.com"
      });
    });
  });
});
