# NestMap - Test Suite

## 🧪 **Test Coverage Overview**

This directory contains comprehensive test suites for the NestMap platform, covering core functionality, API endpoints, and integration scenarios.

### **Test Categories**

#### **✅ Unit Tests**
- **`auth.test.ts`** - Authentication and JWT token validation
- **`organizations.test.ts`** - Organization CRUD operations
- **`trips.test.ts`** - Trip management and validation
- **`analytics.test.ts`** - Analytics and reporting functions

#### **✅ Integration Tests**
- **`integration-test.ts`** - End-to-end API workflow testing
- **`ai-integration.test.ts`** - OpenAI and voice interface integration
- **`white-label-integration.test.ts`** - Multi-tenant white-label features
- **`activities.test.ts`** - Activity booking and management

#### **✅ Feature Tests**
- **`mobile-modal.test.ts`** - Mobile interface and modal components
- **`subscription-limits.test.ts`** - Subscription tier validation
- **`comprehensive-endpoint-check.ts`** - API endpoint availability

#### **✅ Validation Tests**
- **`validate-subscription-tiers.js`** - Business logic validation
- **`validation-summary.js`** - Data validation summary
- **`test-location-search.js`** - Location search functionality
- **`test-ai-location.mjs`** - AI-powered location services

## 🚀 **Running Tests**

### **Prerequisites**
```bash
# Install dependencies
pnpm install

# Ensure test database is configured
cp .env.example .env.test
# Edit .env.test with test database credentials
```

### **Test Commands**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test auth.test.ts

# Run integration tests only
pnpm test integration-test.ts
```

### **Test Configuration**
- **Framework**: Jest with TypeScript support
- **Setup**: `jest.setup.ts` and `setup.ts` for test environment
- **Database**: Separate test database for isolation
- **Mocking**: External API mocks for reliable testing

## 📊 **Test Coverage Status**

### **Current Coverage**
- **Authentication**: ✅ Complete (login, registration, JWT validation)
- **Organizations**: ✅ Complete (CRUD, multi-tenant isolation)
- **Trips**: ✅ Complete (creation, updates, validation)
- **Analytics**: ✅ Complete (reporting, data aggregation)
- **AI Integration**: ✅ Complete (OpenAI, voice processing)
- **White-Label**: ✅ Complete (branding, customization)
- **Mobile Features**: ✅ Complete (responsive, modal interactions)

### **API Endpoint Coverage**
```
✅ POST /api/auth/login
✅ POST /api/auth/register
✅ GET /api/auth/me
✅ GET /api/organizations
✅ POST /api/organizations
✅ PUT /api/organizations/:id
✅ GET /api/trips
✅ POST /api/trips
✅ PUT /api/trips/:id
✅ DELETE /api/trips/:id
✅ POST /api/flights/search
✅ GET /api/analytics/dashboard
✅ POST /api/voice/command
```

## 🔧 **Test Environment Setup**

### **Environment Variables**
```env
# Test Database
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/nestmap_test

# Test API Keys (use test/sandbox keys)
TEST_DUFFEL_API_TOKEN=duffel_test_xxx
TEST_OPENAI_API_KEY=sk-test-xxx

# JWT Test Configuration
TEST_JWT_SECRET=test-secret-key
TEST_JWT_EXPIRES_IN=1h
```

### **Database Setup**
```bash
# Create test database
createdb nestmap_test

# Run migrations for test database
DATABASE_URL=$TEST_DATABASE_URL pnpm db:push
```

## 🧪 **Example Test Structure**

### **Unit Test Example**
```typescript
// auth.test.ts
import { describe, it, expect } from '@jest/globals';
import { validateJWT, hashPassword } from '../server/utils/auth';

describe('Authentication Utils', () => {
  it('should hash passwords securely', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should validate JWT tokens', () => {
    const token = 'valid.jwt.token';
    const result = validateJWT(token);
    expect(result.valid).toBe(true);
  });
});
```

### **Integration Test Example**
```typescript
// integration-test.ts
import request from 'supertest';
import app from '../server/index';

describe('API Integration', () => {
  it('should complete full booking workflow', async () => {
    // 1. Login user
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    const token = loginResponse.body.token;

    // 2. Search flights
    const searchResponse = await request(app)
      .post('/api/flights/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'JFK', destination: 'LAX' });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.offers).toBeDefined();
  });
});
```

## 📋 **Test Maintenance**

### **Adding New Tests**
1. Create test file following naming convention: `feature.test.ts`
2. Import necessary testing utilities and mocks
3. Follow existing test structure and patterns
4. Update this README with new test coverage

### **Test Data Management**
- Use factory functions for test data creation
- Clean up test data after each test run
- Use database transactions for test isolation

### **Continuous Integration**
- Tests run automatically on pull requests
- Coverage reports generated and tracked
- Failed tests block deployment to production

## 🎯 **For New Developers**

### **Quick Start Testing**
```bash
# 1. Clone repository
git clone <repository-url>

# 2. Install dependencies
pnpm install

# 3. Set up test environment
cp .env.example .env.test
# Configure test database and API keys

# 4. Run tests
pnpm test

# 5. Run specific test category
pnpm test auth.test.ts
```

### **Writing Your First Test**
1. Look at existing tests for patterns
2. Use the same imports and setup structure
3. Follow the AAA pattern: Arrange, Act, Assert
4. Add meaningful test descriptions
5. Test both success and error scenarios

---

**Note for Buyers**: This test suite provides a solid foundation for quality assurance. While comprehensive, additional tests can be added as needed for specific business requirements or edge cases. The existing test structure makes it easy to extend coverage for new features.
