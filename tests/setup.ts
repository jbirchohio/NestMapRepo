/**
 * Test setup configuration for Remvana
 */

import { beforeAll, afterAll } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://neondb_owner:npg_heyosY71KqiV@ep-lingering-pine-aez2izws-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing';

// Disable external services for testing
process.env.DUFFEL_API_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.SENDGRID_API_KEY = 'SG.test-key';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs in tests
console.log = jest.fn();
console.warn = jest.fn();

// Test helper to create JWT tokens
export function createTestJWT(payload: any): string {
  const crypto = require('crypto');
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Add expiration time (1 hour from now)
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
    
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Clean up test data before all tests
beforeAll(async () => {
  // Dynamic import to avoid loading DB modules too early
  try {
    const { db } = await import('../server/db');
    const { users, organizations } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Clean up any existing test users
    const testEmails = ['test@example.com', 'superadmin@remvana.com', 'admin@example.com'];
    
    // First delete any impersonation sessions if the table exists
    try {
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`DELETE FROM impersonation_sessions WHERE admin_id IN (
        SELECT id FROM users WHERE email IN ('test@example.com', 'superadmin@remvana.com', 'admin@example.com')
      )`);
    } catch (e) {
      // Table might not exist, ignore
    }
    
    for (const email of testEmails) {
      const existingUsers = await db.select().from(users).where(eq(users.email, email));
      for (const user of existingUsers) {
        if (user.organization_id) {
          await db.delete(organizations).where(eq(organizations.id, user.organization_id));
        }
        await db.delete(users).where(eq(users.id, user.id));
      }
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

// Test cleanup after all tests
afterAll(async () => {
  // Dynamic import to avoid loading DB modules too early
  try {
    const { pool } = await import('../server/db');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  } catch (error) {
    // Ignore errors in cleanup
  }
});