# NestMap Server Tests

This directory contains tests for the NestMap server application. The tests are organized by feature area and use Jest as the testing framework.

## Test Structure

- `websocket/` - Tests for real-time collaboration features
- `stripe/` - Tests for Stripe integration (subscriptions, payments, card issuing)

## Running Tests

To run all tests:

```bash
npm test
```

To run tests for a specific feature:

```bash
npm test -- --testPathPattern=websocket
npm test -- --testPathPattern=stripe
```

## Testing Approach

### WebSocket Collaboration Tests

The WebSocket tests (`websocket/collaboration.test.ts`) verify the real-time collaboration functionality:

- Authentication and connection handling
- Trip room management (join/leave)
- Real-time updates between clients
- Organization isolation (data segregation)
- User presence tracking

These tests use a local WebSocket server and multiple client connections to simulate real-world collaboration scenarios.

### Stripe Integration Tests

The Stripe tests are split into multiple files:

1. **Core Functionality** (`stripe/stripe-core.test.ts`)
   - Customer creation
   - Subscription management (create, update, cancel)
   - Plan configuration validation

2. **Card Issuing** (`stripe/stripe-issuing.test.ts`)
   - Virtual card issuance
   - Card controls and limits
   - Card status management (suspend, reactivate)
   - Error handling for misconfigured environments

3. **Webhooks** (`stripe/stripe-webhooks.test.ts`)
   - Payment success/failure handling
   - Subscription lifecycle events
   - Security (signature verification)
   - Error handling

All Stripe tests use mocked Stripe SDK instances to avoid making actual API calls during testing.

## Mocking Strategy

We use Jest's mocking capabilities to isolate the components being tested:

- External services (Stripe API) are fully mocked
- Database interactions use mock implementations
- WebSocket connections are tested with real instances but on ephemeral ports

## Adding New Tests

When adding new tests:

1. Follow the existing directory structure
2. Use descriptive test names that explain the behavior being tested
3. Mock external dependencies appropriately
4. Include both success and failure scenarios
5. Test edge cases and error handling

## Continuous Integration

These tests are integrated into our CI pipeline and run automatically on pull requests and before deployments. All tests must pass before code can be merged to the main branch.
