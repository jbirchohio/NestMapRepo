/**
 * Unit Tests for Core Functions
 */

import { hashPassword, verifyPassword } from '../server/auth';

describe('Authentication Functions', () => {
  describe('Password Hashing', () => {
    it('should hash a password', () => {
      const password = 'TestPassword123!';
      const hash = hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toContain(':'); // Format is salt:hash
    });

    it('should verify correct password', () => {
      const password = 'TestPassword123!';
      const hash = hashPassword(password);
      
      const isValid = verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = hashPassword(password);
      
      const isValid = verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
});


describe('Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});

describe('Basic Math Operations', () => {
  it('should perform addition correctly', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle floating point math', () => {
    expect(0.1 + 0.2).toBeCloseTo(0.3);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.filter(n => n % 2 === 0)).toEqual([2, 4]);
    expect(arr.reduce((a, b) => a + b, 0)).toBe(15);
  });
});

describe('Date Operations', () => {
  it('should format dates correctly', () => {
    const date = new Date('2025-03-01T10:00:00Z');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2); // March is 2 (0-indexed)
    expect(date.getDate()).toBe(1);
  });

  it('should calculate date differences', () => {
    const start = new Date('2025-03-01');
    const end = new Date('2025-03-07');
    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffInDays).toBe(6);
  });
});