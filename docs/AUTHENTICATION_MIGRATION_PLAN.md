# Authentication Type Migration Plan

## Overview
This document outlines the steps required to migrate the authentication system to use shared types as the single source of truth. The goal is to eliminate type duplication and ensure consistency across the client and server.

## Current Issues

### 1. Type Duplication
- **Client**: Defines its own `JwtPayload` in `tokenManager.ts`
- **Server**: Defines `TokenPayload` in `auth/jwt/types.ts`
- **Shared**: Has canonical types in `shared/types/auth/*`

### 2. Inconsistent Type Usage
- Client's `AuthService` uses shared DTOs but not JWT types
- Server's JWT implementation isn't using shared types
- Token validation logic has diverged between client and server

## Migration Steps

### Phase 1: Align Shared Types (1-2 days)

1. **Update Shared Types**
   - Ensure all necessary types exist in `shared/types/auth/*`
   - Add any missing fields from client/server implementations
   - Add JSDoc comments for better developer experience

2. **Version Shared Package**
   - Bump version in `shared/package.json`
   - Update changelog with breaking changes

### Phase 2: Update Client (2-3 days)


1. **Token Manager Updates**
   - Replace local `JwtPayload` with shared type
   - Update token validation to use shared types
   - Ensure proper error handling for type mismatches

2. **Auth Service Updates**
   - Verify all DTOs use shared types
   - Update response handling to use shared `AuthResponse`
   - Add type guards for runtime validation

3. **API Client Updates**
   - Update interceptors to use shared types
   - Ensure proper error typing
   - Add request/response validation

### Phase 3: Update Server (2-3 days)


1. **JWT Implementation**
   - Replace local `TokenPayload` with shared type
   - Update token generation/validation logic
   - Ensure proper error handling

2. **Auth Service**
   - Update to use shared DTOs
   - Align response types with shared types
   - Add validation middleware

3. **API Routes**
   - Update route handlers to use shared types
   - Add request validation
   - Ensure consistent error responses

### Phase 4: Testing (1-2 days)

1. **Unit Tests**
   - Update existing tests
   - Add new tests for type validation
   - Test edge cases

2. **Integration Tests**
   - Test auth flow end-to-end
   - Verify token refresh
   - Test error scenarios

3. **Manual Testing**
   - Test all auth-related features
   - Verify error messages
   - Check browser console for warnings

## Rollback Plan

1. **Before Deployment**
   - Create database backup
   - Document current auth state
   - Prepare rollback commit

2. **If Issues Arise**
   - Revert to previous version
   - Restore database if needed
   - Analyze logs for root cause

## Success Criteria

- All auth-related types come from shared package
- No type assertions or `any` in auth code
- All tests pass
- No runtime type errors in production
- Improved type safety and developer experience

## Future Improvements

1. **Automated Contract Testing**
   - Add contract tests for API
   - Validate types at build time

2. **Enhanced Security**
   - Implement token binding
   - Add device fingerprinting
   - Rate limiting improvements

3. **Developer Tooling**
   - Add OpenAPI/Swagger docs
   - Generate client SDKs
   - Improve error messages
