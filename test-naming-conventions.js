/**
 * Test script for unified naming conventions
 * Tests organizationId vs organization_id consistency
 */

const express = require('express');
const session = require('express-session');

// Test 1: Check user object structure after authentication
console.log("=== Test 1: User Object Structure ===");

// Mock session with user ID
const mockReq = {
  session: { userId: 1 },
  path: '/api/trips',
  query: {},
  user: null,
  organizationId: null,
  organizationContext: null
};

const mockRes = {
  status: (code) => ({ json: (data) => console.log(`Response ${code}:`, data) }),
  json: (data) => console.log('Response:', data)
};

// Test 2: Verify organization context is properly set
console.log("\n=== Test 2: Organization Context ===");

try {
  // Import the unified auth middleware
  const { unifiedAuthMiddleware } = require('./server/middleware/unifiedAuth');
  
  // Test with mock user
  unifiedAuthMiddleware(mockReq, mockRes, () => {
    console.log('✅ Middleware executed successfully');
    console.log('User object:', mockReq.user);
    console.log('Organization ID:', mockReq.organizationId);
    console.log('Organization Context:', mockReq.organizationContext);
  });
} catch (error) {
  console.log('❌ Middleware test failed:', error.message);
}

// Test 3: Check database query helper
console.log("\n=== Test 3: Database Query Helper ===");

try {
  const { withOrganizationScope } = require('./server/middleware/unifiedAuth');
  
  // Mock request with organization context
  const mockAuthReq = {
    user: { role: 'user' },
    organizationId: 123,
    query: {}
  };
  
  const scopedQuery = withOrganizationScope(mockAuthReq, { userId: 456 });
  console.log('✅ Scoped query structure:', scopedQuery);
  
  // Check if it uses the correct field name
  if (scopedQuery.organization_id !== undefined) {
    console.log('✅ Uses correct database field name: organization_id');
  } else if (scopedQuery.organizationId !== undefined) {
    console.log('⚠️  Uses camelCase field name: organizationId');
  } else {
    console.log('❌ No organization field found in query');
  }
} catch (error) {
  console.log('❌ Query helper test failed:', error.message);
}

// Test 4: TypeScript compilation check
console.log("\n=== Test 4: TypeScript Compilation ===");
console.log("Run 'npm run tsc' to check for type errors");
console.log("Expected: No errors about missing organization_id properties");