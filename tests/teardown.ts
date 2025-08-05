/**
 * Global teardown for Jest tests
 * This runs after all test suites have completed
 * Ensures all resources are cleaned up even if tests fail
 */

// Don't import modules that may start intervals at the top level

export default async function teardown() {
  console.log('🧹 Running global test teardown...');

  try {
    // Configure module alias for teardown
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function (request: string, parent: any, isMain: boolean) {
      if (request.startsWith('@shared/')) {
        return originalResolveFilename.call(this, request.replace('@shared/', '../shared/'), parent, isMain);
      }
      return originalResolveFilename.call(this, request, parent, isMain);
    };

    // Now we can import modules that use @shared
    const { cleanupTestApp } = await import('../server/test-app');
    await cleanupTestApp();
    
    // Final database pool cleanup
    const { pool } = await import('../server/db');
    if (pool && typeof pool.end === 'function') {
      console.log('Final database pool cleanup...');
      await pool.end();
      console.log('Database pool closed in teardown');
    }
    
  } catch (error) {
    console.error('Error in global teardown:', error);
  }

  console.log('Global teardown completed');
}