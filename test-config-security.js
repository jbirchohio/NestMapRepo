/**
 * Test script for configuration security validation
 */

// Test 1: Production mode without required environment variables
console.log("=== Test 1: Production validation without required vars ===");
process.env.NODE_ENV = 'production';
delete process.env.SESSION_SECRET;
delete process.env.CORS_ORIGIN;
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.VITE_MAPBOX_TOKEN = 'pk.test';

try {
  const { validateConfig } = require('./server/config.ts');
  validateConfig();
  console.log('❌ ERROR: Should have failed validation');
} catch (error) {
  console.log('✅ Validation correctly failed:', error.message);
}

// Test 2: Production mode with all required vars
console.log("\n=== Test 2: Production validation with all required vars ===");
process.env.SESSION_SECRET = 'secure-production-secret-123';
process.env.CORS_ORIGIN = 'https://myapp.com';

try {
  const { validateConfig } = require('./server/config.ts');
  validateConfig();
  console.log('✅ Production validation passed');
} catch (error) {
  console.log('❌ Unexpected validation failure:', error.message);
}

// Test 3: Development mode with missing optional vars
console.log("\n=== Test 3: Development mode with warnings ===");
process.env.NODE_ENV = 'development';
delete process.env.OPENAI_API_KEY;

try {
  const { validateConfig } = require('./server/config.ts');
  validateConfig();
  console.log('✅ Development mode validation passed with warnings');
} catch (error) {
  console.log('❌ Unexpected validation failure:', error.message);
}

// Test 4: CORS origin parsing
console.log("\n=== Test 4: CORS origin configuration ===");
process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'https://app1.com,https://app2.com';

try {
  const { SERVER_CONFIG } = require('./server/config.ts');
  console.log('✅ CORS origins:', SERVER_CONFIG.corsOrigin);
} catch (error) {
  console.log('❌ CORS parsing failed:', error.message);
}