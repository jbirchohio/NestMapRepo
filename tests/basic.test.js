/**
 * Basic JavaScript test - no TypeScript, no imports
 */

describe('Basic Jest Test', () => {
  test('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('hello').toBe('hello');
  });
});