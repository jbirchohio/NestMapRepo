# Remvana Test Suite

Comprehensive testing infrastructure for enterprise-grade travel management platform.

## Overview

This test suite provides comprehensive coverage for Remvana, demonstrating production readiness for potential acquisitions. The tests cover:

- **Authentication & Authorization** - JWT-based auth, security validation
- **API Endpoints** - CRUD operations, error handling, data validation  
- **Middleware** - Rate limiting, organization scoping, case conversion
- **Services** - External integrations (Stripe, Email, AI, Flight APIs)
- **Database** - Schema validation, data integrity, performance
- **Integration** - End-to-end workflows and business logic

## Test Categories

### 🔐 Authentication Tests (`auth.test.ts`)
- User registration and login workflows
- JWT token validation and security
- Password hashing and validation
- Rate limiting and security measures
- Organization association

### 🛡️ Middleware Tests (`middleware.test.ts`)
- JWT authentication middleware
- Rate limiting (API, auth, organization-specific)
- Organization scoping and data isolation
- Case conversion (camelCase ↔ snake_case)
- Security headers and CORS
- Input validation and SQL injection prevention

### 🔧 Service Tests (`services.test.ts`)
- Email service (SendGrid integration)
- Payment processing (Stripe)
- Corporate card issuing
- Flight search API (Duffel)
- AI services (OpenAI)
- Analytics and reporting

### 🌐 Integration Tests (`integration.test.ts`)
- End-to-end user workflows
- Multi-tenant organization isolation
- Trip management lifecycle
- Authentication flows
- Error handling and recovery
- Performance under load

### 📊 Database Tests (`database.test.ts`)
- Schema validation and constraints
- Foreign key relationships
- Data integrity and cascading
- Performance and indexing
- Concurrent access handling

### 🎯 Existing Tests
- Trip management (`trips.test.ts`)
- Organization management (`organizations.test.ts`)
- Activity management (`activities.test.ts`)

## Quick Start

### Prerequisites

1. **Test Database**: Set up a separate test database
   ```bash
   # Set test database URL
   export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/remvana_test"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI mode (no watch, with coverage)
npm run test:ci
```

### Test Categories

```bash
# Security tests (auth + middleware)
npm run test:security

# Unit tests (excluding integration)
npm run test:unit

# End-to-end integration tests
npm run test:e2e

# Specific test files
npm run test:auth
npm run test:middleware
npm run test:services
npm run test:integration
npm run test:database
```

### Coverage Reports

```bash
# Generate and view coverage
npm run test:coverage

# Serve coverage report on http://localhost:3001
npm run coverage:serve

# Open coverage in browser (macOS)
npm run coverage:open
```

## Test Environment

### Environment Variables

Required test environment variables:

```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/remvana_test
JWT_SECRET=test-jwt-secret-key-for-testing
SESSION_SECRET=test-session-secret-key-for-testing

# Mock external services
DUFFEL_API_KEY=test-key
OPENAI_API_KEY=test-key
STRIPE_SECRET_KEY=sk_test_fake
SENDGRID_API_KEY=SG.test-key
```

### Database Setup

The test suite automatically:
1. Creates a test organization
2. Cleans up data between tests
3. Provides helper functions for creating test data

### Mocking Strategy

External services are mocked to:
- Ensure tests run without external dependencies
- Provide predictable test results
- Test error scenarios
- Speed up test execution

## Test Utilities

### Helper Functions

```typescript
// Create test user with optional overrides
const testUser = await createTestUser({
  email: 'custom@example.com',
  role: 'admin'
});

// Create test trip
const testTrip = await createTestTrip(userId, {
  name: 'Custom Trip',
  budget: 5000
});
```

### Custom Matchers

The test suite includes custom Jest matchers for common assertions:
- JWT token validation
- Database constraint validation
- API response structure validation

## Coverage Goals

Target coverage thresholds for enterprise readiness:

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Critical Areas (90%+ coverage required)

- Authentication and authorization
- Payment processing
- Data access and security
- Multi-tenant isolation
- API security middleware

## Performance Testing

Integration tests include performance validation:

- Concurrent request handling
- Database query performance
- Rate limiting effectiveness
- Memory usage under load

## Debugging Tests

### Verbose Output

```bash
# Show detailed test output
npm run test:verbose

# Show console logs and errors
VERBOSE_TESTS=true SHOW_TEST_ERRORS=true npm test
```

### Individual Test Debugging

```bash
# Run specific test file
npx jest tests/auth.test.ts

# Run specific test case
npx jest -t "should create a new user successfully"

# Debug mode
node --inspect-brk node_modules/.bin/jest tests/auth.test.ts
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: npm run test:ci
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: coverage/lcov.info
```

### Test Reports

The test suite generates multiple report formats:
- **Console**: Real-time feedback during development
- **LCOV**: For code coverage tools
- **HTML**: Human-readable coverage reports
- **JSON**: For programmatic analysis

## Contributing

### Adding New Tests

1. **Follow naming conventions**: `feature.test.ts`
2. **Use descriptive test names**: `should handle invalid login gracefully`
3. **Group related tests**: Use `describe` blocks for organization
4. **Clean up after tests**: Use `afterEach` for data cleanup
5. **Mock external dependencies**: Keep tests isolated and fast

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    let testData: any;

    beforeEach(async () => {
      // Setup test data
      testData = await createTestData();
    });

    afterEach(async () => {
      // Cleanup if needed
    });

    it('should handle normal case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Error case testing
    });
  });
});
```

## Security Testing

The test suite includes comprehensive security validation:

- **Authentication bypass attempts**
- **JWT token tampering**
- **SQL injection prevention** 
- **Cross-organization data access**
- **Rate limiting effectiveness**
- **Input validation and sanitization**

## Enterprise Readiness

This test suite demonstrates enterprise readiness through:

1. **Comprehensive Coverage**: All critical business logic tested
2. **Security Validation**: Thorough security testing
3. **Performance Testing**: Load and concurrency testing
4. **Integration Testing**: End-to-end workflow validation
5. **Error Handling**: Graceful error handling and recovery
6. **Multi-tenancy**: Organization isolation testing
7. **Documentation**: Clear test documentation and reporting

The test suite provides confidence for potential acquirers that the platform is robust, secure, and ready for enterprise deployment.