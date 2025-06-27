# Codebase Refactoring Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Type System](#type-system)
5. [Server Structure](#server-structure)
6. [Express & Middleware](#express--middleware)
7. [Best Practices](#best-practices)
8. [Implementation Checklist](#implementation-checklist)

## Overview

This document serves as a comprehensive guide for refactoring the codebase to improve maintainability, type safety, and developer experience.

### Key Principles
- **Simplicity**: Keep it simple and straightforward
- **Consistency**: Follow established patterns
- **Documentation**: Document all public APIs
- **Type Safety**: Minimize `any` types
- **Performance**: Optimize for both development and runtime

## Getting Started

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- pnpm (recommended)

### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Project Structure
```
├── client/           # Frontend application
├── server/           # Backend services
├── shared/           # Shared code
└── refactor.md       # This document
```

## Architecture

### Frontend (Client)
- React 18 with TypeScript
- State management with React Query
- Component library with Storybook

### Backend (Server)
- Node.js with Express
- PostgreSQL with Drizzle ORM
- JWT Authentication

### Shared Code
- Common types and utilities
- Validation schemas
- API client

## Type System

### Current Issues
1. **Type Duplication**
   - Same types defined in multiple places
   - Inconsistent type definitions
   - Missing type safety

2. **`any` Types**
   - Overuse of `any` type
   - Missing type guards
   - Inconsistent null/undefined handling

### Type Organization

#### Shared Types Structure
```
shared/
  src/
    types/
      auth/              # Authentication types
        user.types.ts
        session.types.ts
      booking/           # Booking system types
        booking.types.ts
        flight.types.ts
        hotel.types.ts
      common/            # Common utilities
        api.types.ts
        error.types.ts
      index.ts           # Public API
```

#### Example Type Definition
```typescript
// shared/src/types/booking/flight.types.ts

/** Represents a flight search result */
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  price: number;
  currency: string;
}

/** Search parameters for flight queries */
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass?: 'economy' | 'premium' | 'business' | 'first';
}
```

### Type Safety Rules
1. **No `any` Types**
   ```typescript
   // Bad
   function processData(data: any) { ... }
   
   // Good
   function processData<T>(data: T): ProcessedData<T> { ... }
   ```

2. **Use Type Guards**
   ```typescript
   function isUser(data: unknown): data is User {
     return (
       typeof data === 'object' &&
       data !== null &&
       'id' in data &&
       'email' in data
     );
   }
   ```

3. **Null/Undefined Handling**
   ```typescript
   // Bad
   function getName(user: User): string {
     return user.name; // What if name is undefined?
   }
   
   // Good
   function getName(user: User): string | undefined {
     return user.name;
   }
   
   // Better
   function getName(user: User): string {
     if (!user.name) {
       throw new Error('Name is required');
     }
     return user.name;
   }
   ```

## Duplicate Interfaces Analysis

After analyzing both client and server codebases, I've identified several interfaces that are duplicated or have overlapping concerns. These should be consolidated into shared interfaces:

### 1. User Management
- **Client**: `User` (in `client/src/types/user.ts`)
- **Server**: `User` (in `server/src/auth/interfaces/user.interface.ts`)
- **Overlap**: Both contain user profile information, authentication status, and preferences

### 2. Booking System
- **Client**: `BookingDetails` (in `client/src/components/booking/types.ts`)
- **Server**: `BookingDetails` (in `server/src/common/interfaces/booking.interfaces.ts`)
- **Overlap**: Core booking information, status, and metadata

### 3. Flight Bookings
- **Client**: `Flight` (in `client/src/types/dtos/flight.ts`)
- **Server**: `FlightBooking` (in `server/src/common/interfaces/booking.interfaces.ts`)
- **Overlap**: Flight details, segments, pricing, and booking information

### 4. Hotel Bookings
- **Client**: `Hotel` (in `client/src/components/booking/types/hotel.ts`)
- **Server**: `HotelBooking` (in `server/src/common/interfaces/booking.interfaces.ts`)
- **Overlap**: Hotel details, room information, and booking data

### 5. API Responses
- **Client**: `ApiResponse` (in `client/src/types/api.ts`)
- **Server**: `ApiResponse` (in `server/src/common/interfaces/api.interface.ts`)
- **Overlap**: Standardized API response format with data/error handling

### 6. Error Handling
- **Client**: `ApiError` (in `client/src/types/error.ts`)
- **Server**: `ApiError` (in `server/src/common/interfaces/error.interface.ts`)
- **Overlap**: Error structure, error codes, and error messages

## Comprehensive Inline Types Analysis

After a thorough examination of the codebase, I've identified numerous inline type definitions that should be moved to shared interfaces. Here's a comprehensive list organized by domain:

### 1. API and Services
- **Location Service**
  - `RequestConfig` (duplicated across services)
  - `GeolocationCoordinates`
  - `GeolocationPosition`
  - `GeolocationPositionError`
  - `PositionOptions`

- **Authentication**
  - `LoginFormValues`
  - `SessionState`
  - `SessionLockoutConfig`
  - `PasswordValidationResult`
  - `PasswordHistory`

### 2. Booking and Travel
- **Traveler Information**
  - `TravelerInfo`
  - `TravelerBooking`
  - `ClientInfo`
  - `BaseTrip` (from useTrips hook)

- **Booking Workflow**
  - `BookingStep`
  - `TripType`
  - `BookingFormData`
  - `FormDataObject`
  - `BookingSystemProps`

- **Flights**
  - `SimpleFlight`
  - `FlightResult`
  - `FlightSearchParams`
  - `FlightSearchResponse`
  - `FlightBookingRequest`
  - `FlightBookingResponse`

- **Hotels**
  - `Hotel`
  - `HotelResult`
  - `HotelSearchParams`
  - `HotelSearchResponse`

### 3. UI Components
- **Forms**
  - `FormItemContextValue`
  - `FormDataObject`

- **Navigation**
  - `SidebarContextProps`
  - `PaginationLinkProps`

- **Data Display**
  - `CarouselProps`
  - `CarouselContextProps`
  - `ChartConfig`
  - `ChartContextProps`

### 4. Application State
- **Authentication**
  - `SecurityContext`
  - `SessionDetails`
  - `SecurityHeaders`
  - `CSRFTokenConfig`
  - `CSRFTokenOptions`

- **Error Handling**
  - `SanitizedError`
  - `ErrorLog`
  - `ErrorContext`
  - `ApiClientErrorOptions`

### 5. Data Transfer Objects (DTOs)
- **Common**
  - `ErrorResponse`
  - `SortOption`
  - `PaginationParams`

- **Trips**
  - `TripDTO`
  - `TripCardDTO`

- **Analytics**
  - `AnalyticsTimeRange`
  - `AnalyticsFilterParams`
  - `AgencyAnalyticsDTO`
  - `CorporateAnalyticsDTO`

### 6. Utility Types
- **Performance**
  - `PerformanceMetrics`

- **Pattern Matching**
  - `ParsedSuggestion`
  - `PatternConfig`

- **Rate Limiting**
  - `RateLimitConfig`
  - `RequestConfig` (duplicated)

## Current State Analysis

After analyzing both client and server codebases, I've identified several areas where types and interfaces are duplicated or could benefit from being shared between the frontend and backend.

## Domain Models to Share

### 1. User Management
- **Current Location**: `server/src/auth/interfaces/user.interface.ts`
- **Types to Share**:
  - `User` interface
  - `UserRole` enum
  - Authentication tokens and refresh tokens
  - Session-related types

### 2. Booking System
- **Current Locations**: 
  - `client/src/components/booking/types.ts`
  - `client/src/components/booking/types/hotel.ts`
  - `client/src/components/booking/types/booking.ts`
- **Types to Share**:
  - `BookingDetails` interface
  - `BookingStep` type
  - `Hotel` interface and related types (Room, Amenity, etc.)
  - `FlightSearchParams` and `FlightSearchResponse`
  - `HotelSearchParams` and `HotelSearchResponse`

### 3. Organization Management
- **Current Location**: Various repository interfaces in server
- **Types to Share**:
  - `Organization` interface
  - `OrganizationMember` interface
  - `OrganizationRole` enum
  - Organization settings and preferences

### 4. Trips
- **Current Location**: Server repository interfaces
- **Types to Share**:
  - `Trip` interface
  - `TripStatus` enum
  - Itinerary-related types

## Shared Types Structure

```
shared/
  src/
    auth/
      user.types.ts          # User, AuthToken, Session types
    booking/
      booking.types.ts      # Core booking interfaces
      flight.types.ts       # Flight-specific types
      hotel.types.ts        # Hotel-specific types
    organization/
      organization.types.ts # Org and member types
    trip/
      trip.types.ts         # Trip and itinerary types
    common/
      api.types.ts         # Common API types
      error.types.ts       # Error handling types
    index.ts               # Main exports
```

### Key Points:
- One type per file when it makes sense
- Group related types together
- Keep it flat - avoid unnecessary nesting
- Use `.types.ts` suffix for type files
    ├── sorting.interface.ts
    └── api-response.interface.ts
```

## Additional Cleanup Tasks

### 1. Duplicate Type Definitions
- **Issue**: Multiple type definition files with similar purposes
  - `shared/types/*.d.ts` vs `shared/types/dist/*.d.ts`
  - `client/src/types/*.ts` vs `shared/types/*.d.ts`
- **Action**: Consolidate type definitions into a single source of truth in `shared/types`

### 2. Redundant Type Files
- **Files to Review**:
  - `shared/interfaces.d.ts` (potentially redundant with `shared/types/*.d.ts`)
  - `client/src/types/axios.d.ts` (could be moved to shared types)
  - `client/src/types/api.ts` vs `shared/types/api.d.ts`

### 3. Build Artifacts in Source Control
- **Issue**: `dist/` directories are in source control
  - `dist/shared/types/*`
  - `dist/shared/utils/*`
- **Action**: Add `dist/` to `.gitignore` and remove from source control

### 4. Type Definition Organization
- **Issue**: Inconsistent type definition organization
  - Some types are in `.ts` files, others in `.d.ts`
  - Mixed concerns in type files (e.g., API types with domain types)
- **Action**: Standardize on `.ts` files with proper exports

### 5. Unused Type Definitions
- **Issue**: Potentially unused type definitions in:
  - `shared/types/Shared*.d.ts` (e.g., `SharedApiHotelType.d.ts`, `SharedActivityType.d.ts`)
  - `client/src/types/*.d.ts`
- **Action**: Audit and remove unused type definitions

## Large Components Analysis

### Components Exceeding 500 Lines (Critical)

1. **BookingWorkflow.tsx** (750 lines)
   - **Issues**: Combines booking logic, UI, and state management
   - **Suggested Breakdown**:
     - Extract `BookingForm` component for form handling
     - Create `BookingSummary` for the summary view
     - Move booking steps to separate components
     - Extract hooks for booking logic

2. **HotelSelectionStep.tsx** (657 lines)
   - **Issues**: Handles hotel search, filtering, and selection
   - **Suggested Breakdown**:
     - Create `HotelSearchForm` for search inputs
     - Extract `HotelList` for displaying results
     - Move filters to `HotelFilters` component
     - Create custom hooks for search logic

3. **TripTeamManagement.tsx** (654 lines)
   - **Issues**: Manages team members and permissions
   - **Suggested Breakdown**:
     - Create `TeamMemberList` component
     - Extract `PermissionSettings` component
     - Move invitation logic to a custom hook

4. **CarbonExpenseTracker.tsx** (646 lines)
   - **Issues**: Combines carbon calculation and UI
   - **Suggested Breakdown**:
     - Create `CarbonCalculator` for calculations
     - Extract `EmissionChart` for visualization
     - Move data fetching to a custom hook

### Components Between 400-500 Lines (High Priority)

1. **TeamManagement.tsx** (544 lines)
   - Break down into `TeamList`, `TeamMemberCard`, and `TeamInviteForm`

2. **OnboardingWizard.tsx** (543 lines)
   - Split into individual step components
   - Extract progress indicator
   - Move wizard logic to a custom hook

3. **WeatherSuggestionsPanel.tsx** (530 lines)
   - Break down into `WeatherCard`, `ForecastList`, and `SuggestionList`

4. **WhiteLabelSettings.tsx** (530 lines)
   - Split into `BrandingForm`, `ThemeEditor`, and `PreviewPanel`

### Refactoring Strategy

1. **Immediate Actions**
   - Start with the largest components first
   - Create a component breakdown plan for each
   - Set up Storybook for component documentation

2. **Component Extraction Guidelines**
   - Single Responsibility Principle: One component, one job
   - Keep components under 300 lines
   - Use composition over inheritance
   - Create custom hooks for business logic

3. **Testing Strategy**
   - Add unit tests for each new component
   - Implement snapshot testing
   - Add integration tests for component interactions

## Implementation Plan

### 1. Setup (Day 1)
- [ ] Create shared types directory structure
- [ ] Set up path aliases in tsconfig.json
- [ ] Add shared types to package.json exports

### 2. Core Types (Day 1-2)
- [ ] User and auth types
- [ ] Base API response/error types
- [ ] Common utility types

### 3. Domain Types (Day 2-3)
- [ ] Booking system types
- [ ] Flight and hotel types
- [ ] Organization types
- [ ] Trip management types

### 4. Integration (Day 3-4)
- [ ] Update imports across codebase
- [ ] Verify type safety
- [ ] Test critical user flows

### 5. Documentation (Day 4-5)
- [ ] Add JSDoc to all shared types
- [ ] Document type usage patterns
- [ ] Create type reference docs
  - `any` types scattered throughout the codebase
  - Inconsistent null/undefined handling
  - Missing type guards and runtime validations
  
- **Code Duplication**
  - Similar utility functions across modules
  - Duplicate validation logic
  - Repeated API response handling

### 2. Architectural Debt
- **Tight Coupling**
  - Direct imports between unrelated modules
  - Business logic mixed with presentation
  - Direct database access from UI components
  
- **State Management**
  - Inconsistent state management patterns
  - Over-reliance on component state
  - Duplicated state across components

### 3. Testing Debt
- **Test Coverage**
  - Incomplete test coverage for critical paths
  - Missing unit tests for shared utilities
  - No integration tests for API endpoints
  
- **Test Quality**
  - Brittle tests with too many mocks
  - Missing test data factories
  - No snapshot testing for critical UI components

### 4. Documentation Debt
- **Code Documentation**
  - Missing JSDoc for public APIs
  - Outdated type definitions
  - Missing architecture decision records (ADRs)
  
- **Project Documentation**
  - Outdated README files
  - Missing setup instructions
  - No contribution guidelines

### 5. Performance Debt
- **Bundle Size**
  - Unused dependencies
  - No code splitting
  - Large third-party libraries
  
- **Rendering Performance**
  - Unoptimized re-renders
  - Missing memoization
  - Inefficient data fetching

### Mitigation Strategy
1. **Immediate Actions** (1-2 weeks)
   - Add missing type definitions
   - Fix critical TypeScript errors
   - Remove unused dependencies
   - Add basic test coverage for critical paths

2. **Short-term** (1-2 months)
   - Refactor duplicated code
   - Implement proper error boundaries
   - Add integration tests
   - Document public APIs

3. **Long-term** (3-6 months)
   - Architectural improvements
   - Performance optimization
   - Comprehensive test coverage
   - Documentation overhaul

## TypeScript Configuration

Update both `tsconfig.json` files to include path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"],
      "@shared/types/*": ["../shared/types/*"]
    }
  }
}
```

## Server Directory Analysis

### Critical Service Files (>500 lines)

1. **auth.service.ts** (981 lines)
   - **Issues**: Monolithic authentication service
   - **Recommended Actions**:
     - Split into `AuthService`, `UserManagementService`, and `SessionService`
     - Extract token generation/validation to a dedicated `TokenService`
     - Move rate limiting and security features to middleware

2. **jwt/index.ts** (689 lines)
   - **Issues**: Large JWT utility file
   - **Recommended Actions**:
     - Split into `JwtGenerator`, `JwtValidator`, and `TokenManager`
     - Extract token refresh logic
     - Move token storage/retrieval to a dedicated service

3. **user.repository.ts** (577 lines) and **UserRepository.ts** (547 lines)
   - **Issues**: Duplicate user repository implementations
   - **Recommended Actions**:
     - Consolidate into a single implementation
     - Split into `UserReadRepository` and `UserWriteRepository`
     - Extract query builders and mappers

### Large Service Files (300-500 lines)

1. **booking.service.ts** (550 lines)
   - **Issues**: Complex booking logic
   - **Recommended Actions**:
     - Split into `BookingCreationService`, `BookingQueryService`
     - Extract validation logic
     - Move notification logic to a separate service

2. **booking.repository.ts** (457 lines)
   - **Issues**: Complex queries and data transformations
   - **Recommended Actions**:
     - Split into smaller, focused repositories
     - Use query builders for complex queries
     - Implement proper pagination and filtering

3. **activity.repository.ts** (411 lines)
   - **Issues**: Similar to booking repository issues
   - **Recommended Actions**:
     - Follow same patterns as booking repository
     - Extract common repository patterns to base classes

## Shared Directory Analysis

The shared directory is well-structured but could benefit from:

1. **Type Consolidation**
   - Merge duplicate type definitions
   - Standardize on `.ts` files with proper exports
   - Add comprehensive JSDoc comments

2. **Utility Organization**
   - Group related utilities into logical modules
   - Add proper error handling and logging
   - Implement consistent error types

3. **Testing**
   - Add unit tests for all shared utilities
   - Implement integration tests for critical paths
   - Add type tests for complex types

## Middleware Analysis and Consolidation

### Duplicate Middleware Files

1. **Validation Middleware**
   - `auth/middleware/validation.middleware.ts` (28 lines)
   - `middleware/validation.middleware.ts` (76 lines)
   - **Issues**:
     - Duplicate validation middleware in different locations
     - Inconsistent validation implementations
   - **Recommended Actions**:
     - Consolidate into a single validation middleware
     - Create domain-specific validators if needed
     - Add comprehensive input validation

2. **Error Handling**
   - `common/middleware/standardized-error-handler.middleware.ts` (109 lines)
   - `common/middleware/error-handler.middleware.test.ts` (91 lines)
   - **Issues**:
     - Split error handling logic
     - Test file is almost as large as implementation
   - **Recommended Actions**:
     - Merge error handling logic
     - Add more comprehensive error types
     - Improve error logging

### Middleware Organization

1. **Authentication**
   - `auth.middleware.ts` (129 lines)
   - `permission.middleware.ts` (196 lines)
   - `rate-limiter.middleware.ts` (29 lines)
   - **Issues**:
     - Authentication concerns split across multiple files
     - Permission middleware is quite large
   - **Recommended Actions**:
     - Create `auth` middleware directory
     - Split permission middleware by resource type
     - Add rate limiting to auth middleware

2. **Testing**
   - `auth.middleware.test.ts` (260 lines)
   - **Issues**:
     - Large test files
     - Potential test duplication
   - **Recommended Actions**:
     - Split tests by functionality
     - Add integration tests
     - Test error cases

### Consolidation Plan

1. **New Structure**
   ```
   src/
   └── common/
       └── middleware/
           ├── auth/
           │   ├── index.ts             # Main auth middleware
           │   ├── rate-limiter.ts     
           │   └── permission/
           │       ├── index.ts
           │       ├── booking.ts
           │       └── user.ts
           ├── validation/
           │   ├── index.ts
           │   ├── auth.ts
           │   └── booking.ts
           └── error-handler/
               ├── index.ts
               └── error-types.ts
   ```

2. **Implementation Steps**
   - Create new directory structure
   - Migrate and consolidate middleware
   - Update imports
   - Add comprehensive tests

## Case Conversion Strategy

### Current State Analysis
- **Frontend (camelCase)**: React components and state management use camelCase
- **Backend (snake_case)**: Database and API responses use snake_case
- **No Automatic Conversion**: No middleware or interceptors currently handle case conversion

### Issues with Current Approach
1. **Inconsistent Naming**: Developers must manually convert between cases
2. **Error-Prone**: Easy to introduce bugs when accessing properties with wrong case
3. **Maintenance Challenges**: Changes in backend models require manual updates in frontend

### Recommended Solution: Centralized Case Conversion

#### 1. API Client Layer (Frontend)
```typescript
// utils/caseConverter.ts
export const toCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamel(obj[key]);
    return acc;
  }, {} as Record<string, any>);
};

export const toSnake = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnake(obj[key]);
    return acc;
  }, {} as Record<string, any>);
};

// services/api/caseMiddleware.ts
import { toCamel, toSnake } from '@/utils/caseConverter';

export const applyCaseMiddleware = (client: AxiosInstance) => {
  // Convert request data to snake_case
  client.interceptors.request.use(config => {
    if (config.data) {
      config.data = toSnake(config.data);
    }
    return config;
  });

  // Convert response data to camelCase
  client.interceptors.response.use(
    response => {
      if (response.data) {
        response.data = toCamel(response.data);
      }
      return response;
    },
    error => Promise.reject(error)
  );

  return client;
};
```

#### 2. Backend Middleware (Optional)
```typescript
// server/src/common/middleware/case-conversion.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { toCamel, toSnake } from '../../utils/caseConverter';

export const caseConversionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Convert request body to camelCase
  if (req.body) {
    req.body = toCamel(req.body);
  }

  // Convert response to snake_case
  const originalSend = res.send;
  res.send = function(data) {
    if (typeof data === 'object' && data !== null) {
      data = toSnake(data);
    }
    return originalSend.call(this, data);
  };

  next();
};
```

#### 3. TypeScript Types
```typescript
// shared/types/case-conversion.d.ts
declare module 'case-conversion' {
  export function toCamel<T = any>(obj: any): T;
  export function toSnake<T = any>(obj: any): T;
}
```

### Implementation Strategy

1. **Frontend Changes**
   - Add case conversion utilities
   - Update API client to handle case conversion
   - Add TypeScript types for type safety

2. **Backend Changes**
   - (Optional) Add case conversion middleware
   - Ensure consistent case in API responses

3. **Testing**
   - Add unit tests for case conversion
   - Add integration tests for API endpoints
   - Test edge cases (nested objects, arrays, dates, etc.)

4. **Documentation**
   - Document case conversion strategy
   - Add examples for common use cases
   - Include in onboarding for new developers

### Benefits
- **Consistency**: Uniform case handling across the application
- **Type Safety**: TypeScript support for converted objects
- **Maintainability**: Centralized logic for case conversion
- **Developer Experience**: No need to think about case conversion in components

## Schema Analysis and Refactoring

### Large Schema Files

1. **schema.d.ts** (22,304 lines)
   - **Issues**:
     - Massive generated type definitions file
     - Contains all database schema types in one place
     - Makes it difficult to find specific types
   - **Recommended Actions**:
     - Split into domain-specific type definition files
     - Generate types on build instead of committing to source control
     - Add to `.gitignore` if it's a generated file

2. **schema.ts** (1,093 lines)
   - **Issues**:
     - Contains all database table definitions
     - Mixes schema definitions with utility types and functions
     - Difficult to navigate and maintain
   - **Recommended Actions**:
     - Split into domain-specific schema files (e.g., `user.schema.ts`, `booking.schema.ts`)
     - Create a central `index.ts` to re-export all schemas
     - Move utility types to separate files

### Schema Organization Issues

1. **Duplicate Schema Definitions**
   - Multiple schema files with similar purposes (e.g., `superadminSchema.ts` and `superadminSchema.d.ts`)
   - Inconsistent naming conventions
   - **Recommendation**:
     - Consolidate schema definitions
     - Use a single source of truth for each schema
     - Automate generation of type definitions

2. **Type Safety**
   - Some schema definitions use `any` type
   - Inconsistent type definitions between frontend and backend
   - **Recommendation**:
     - Use strict TypeScript types
     - Share types between frontend and backend
     - Add runtime validation with Zod

### Proposed Schema Structure

```
server/
  src/
    db/
      schemas/
        auth/
          user.schema.ts
          session.schema.ts
        booking/
          booking.schema.ts
          flight.schema.ts
          hotel.schema.ts
        organization/
          organization.schema.ts
          member.schema.ts
        shared/
          base.schema.ts    # Base types and utilities
          validation.ts    # Shared validation logic
      index.ts             # Export all schemas
```

### Implementation Plan

1. **Phase 1: Schema Reorganization**
   - Create new domain-specific schema files
   - Move table definitions to appropriate files
   - Update imports

2. **Phase 2: Type Generation**
   - Set up automatic type generation
   - Generate frontend types from backend schemas
   - Add validation schemas

3. **Phase 3: Validation**
   - Add runtime validation with Zod
   - Create shared validation utilities
   - Add input sanitization

4. **Phase 4: Documentation**
   - Document schema relationships
   - Add JSDoc comments
   - Create data flow diagrams

### Migration Strategy

1. **Incremental Migration**
   - Migrate one schema at a time
   - Use feature flags for gradual rollout
   - Maintain backward compatibility

2. **Testing**
   - Add unit tests for schema validation
   - Test type safety
   - Add integration tests for database operations

3. **Code Generation**
   - Use tools like `drizzle-kit` for schema management
   - Generate TypeScript types from database
   - Automate migration generation

## Shared Schema Analysis

### Current State

1. **shared/src/schema.ts**
   - Contains core domain interfaces (User, Trip, Activity, etc.)
   - Defines base entity interfaces and types
   - Includes transformation utilities

2. **shared/utils/schema-utils.ts**
   - Provides case conversion utilities (toCamelCase, toSnakeCase)
   - Includes type guards and validation utilities
   - Defines shared type definitions

3. **Redundant Re-exports**
   - `proposalSchema.ts` and `superadmin-schema.ts` are just re-exports from server/db/
   - These create unnecessary indirection

### Issues

1. **Duplication**
   - Types are defined in multiple places (server, shared, client)
   - Re-export files create maintenance overhead

2. **Inconsistent Usage**
   - Some types are used across the stack, others are not
   - No clear boundary between shared and server-specific types

3. **Build Artifacts**
   - Compiled files in `dist/` are checked into source control
   - Makes the repository larger and more complex

### Recommendations

1. **Organize Shared Types by Domain**
   - Split types into domain-specific files under `shared/src/domains/`
   - Remove redundant re-export files
   - Use path aliases for clean imports

2. **Type Organization**
   ```
   shared/
     src/
       domains/
         user/
           types.ts      # User-related types
           schemas.ts    # Validation schemas
           index.ts      # Public API
         booking/
           types.ts      # Booking-related types
           schemas.ts    # Validation schemas
           index.ts      # Public API
       types/
         common.ts     # Common types and interfaces
         api/           # API request/response types
         utils/         # Type utilities
       index.ts         # Main entry point
   ```

3. **Module Structure**
   - Each domain should be self-contained
   - Use barrel files (`index.ts`) for clean exports
   - Keep related types and validations together

3. **Clean Up**
   - Remove build artifacts from source control
   - Add `dist/` to `.gitignore`
   - Set up proper build pipelines

4. **Documentation**
   - Document which types are shared vs. server-specific
   - Add JSDoc comments to all shared types

## Server Structure

### Current Issues
1. **Repository Pattern Inconsistencies**
   - Duplicate query logic across repositories
   - Inconsistent error handling
   - Mixed concerns between business logic and data access

2. **Type Safety**
   - Heavy use of `any` types
   - Inconsistent type mapping
   - Missing input validation

3. **Performance**
   - N+1 query problems
   - Missing caching layer
   - Inefficient data loading

### Repository Pattern

#### Base Repository
```typescript
// server/src/common/repositories/base.repository.ts
export abstract class BaseRepository<T extends Entity, ID> {
  constructor(
    protected readonly table: PgTable,
    protected readonly db: PostgresJsDatabase
  ) {}

  async findById(id: ID): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  // Common CRUD operations...
}
```

#### Domain Repository Example
```typescript
// server/src/modules/booking/repositories/booking.repository.ts
@Injectable()
export class BookingRepository extends BaseRepository<Booking, string> {
  constructor(
    @InjectDatabase() db: PostgresJsDatabase,
    private readonly logger: Logger
  ) {
    super(schema.bookings, db);
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    return this.db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.userId, userId));
  }
}
```

### Service Layer
```typescript
// server/src/modules/booking/services/booking.service.ts
@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly paymentService: PaymentService,
    private readonly logger: Logger
  ) {}

  async createBooking(createDto: CreateBookingDto): Promise<Booking> {
    // Business logic here
    const booking = await this.bookingRepository.create(createDto);
    await this.paymentService.processPayment(booking);
    return booking;
  }
}
```

### API Controllers
```typescript
// server/src/modules/booking/controllers/booking.controller.ts
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() createDto: CreateBookingDto,
    @Request() req: AuthenticatedRequest
  ): Promise<Booking> {
    return this.bookingService.createBooking({
      ...createDto,
      userId: req.user.id
    });
  }
}
```

### Database Schema
```typescript
// server/src/db/schema.ts
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  status: text('status').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
```

## Server Repositories Refactoring

### Current Issues

1. **Type Safety**
   - Heavy use of `any` types in base repository
   - Inconsistent type mapping between DB and domain models
   - Missing proper type guards and validations

2. **Architecture**
   - Inconsistent repository patterns
   - Duplicate code across repositories
   - Tight coupling with database schema

3. **Code Organization**
   - Mixed concerns in repository methods
   - Inconsistent error handling
   - Missing documentation

### Repository Structure

```
server/
  src/
    common/
      repositories/
        base/
          base.repository.ts           # Abstract base class
          repository.interface.ts      # Core interfaces
        booking/
          booking.repository.ts        # Implementation
          booking.repository.interface.ts
          booking.repository.spec.ts   # Tests
        user/
          # Similar structure
    # Other domains...
```

### Refactoring Plan

1. **Base Repository Improvements**
   ```typescript
   // Before
   export abstract class BaseRepositoryImpl<T, ID> {
     constructor(
       protected table: any,
       protected idColumn: any
     ) {}
   }

   // After
   export abstract class BaseRepositoryImpl<
     T extends Entity,
     ID extends string | number,
     CreateDTO = Partial<T>,
     UpdateDTO = Partial<T>
   > {
     constructor(
       protected readonly table: PgTable,
       protected readonly idColumn: PgColumn,
       protected readonly logger: Logger
     ) {}
   }
   ```

2. **Type-Safe Queries**
   - Replace raw SQL with Drizzle ORM queries
   - Add proper return types for all methods
   - Implement proper error handling

3. **Repository Methods**
   - Standardize CRUD operations
   - Add pagination and filtering
   - Implement proper transactions

4. **Testing**
   - Add unit tests for all repositories
   - Use test factories for test data
   - Add integration tests for database operations

### Implementation Steps

1. **Base Repository**
   - [ ] Create type-safe base repository
   - [ ] Add proper error handling
   - [ ] Implement common query patterns

2. **Domain Repositories**
   - [ ] Refactor booking repository
   - [ ] Refactor user repository
   - [ ] Refactor other domain repositories

3. **Testing**
   - [ ] Add test factories
   - [ ] Write unit tests
   - [ ] Add integration tests

4. **Documentation**
   - [ ] Add JSDoc comments
   - [ ] Document patterns and best practices
   - [ ] Create migration guide

## Express & Middleware

### Current Issues
1. **Type Conflicts**
   - Multiple Express type definition files
   - Inconsistent request/response types
   - Missing proper type augmentation

2. **Middleware Organization**
   - Scattered middleware logic
   - Inconsistent error handling
   - No clear middleware execution order

3. **Security Concerns**
   - Missing security headers
   - Incomplete CORS configuration
   - No rate limiting

### Middleware Structure

```
server/
  src/
    common/
      middleware/
        auth/                # Authentication
          jwt.middleware.ts
          session.middleware.ts
        
        validation/          # Request validation
          validator.middleware.ts
          
        error/              # Error handling
          error.handler.ts
          not-found.handler.ts
          
        security/           # Security middleware
          helmet.middleware.ts
          cors.middleware.ts
          rate-limit.middleware.ts
          
        logging/            # Request/response logging
          request.logger.ts
          response.logger.ts
```

### Key Middleware Examples

#### 1. JWT Authentication
```typescript
// server/src/common/middleware/auth/jwt.middleware.ts
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return next(new UnauthorizedException('No token provided'));
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    req.user = decoded as UserPayload;
    next();
  } catch (err) {
    next(new UnauthorizedException('Invalid token'));
  }
};
```

#### 2. Request Validation
```typescript
// server/src/common/middleware/validation/validator.middleware.ts
export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(new BadRequestException('Validation failed', error));
    }
  };
```

#### 3. Error Handling
```typescript
// server/src/common/middleware/error/error.handler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) return next(err);

  const statusCode = err instanceof HttpException 
    ? err.getStatus() 
    : 500;

  const response = {
    statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
```

### Security Middleware

#### 1. Helmet Configuration
```typescript
// server/src/common/middleware/security/helmet.middleware.ts
import helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Add other CSP directives as needed
    },
  },
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true,
    preload: true,
  },
});
```

#### 2. CORS Configuration
```typescript
// server/src/common/middleware/security/cors.middleware.ts
import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

### Request Logging
```typescript
// server/src/common/middleware/logging/request.logger.ts
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'anonymous',
    });
  });

  next();
};
```

### App Configuration
```typescript
// server/src/app.ts
const app = express();

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());

// Logging
app.use(requestLogger);

// Authentication
app.use('/api', authenticateJWT);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
```

## Express and Middleware Refactoring

### Current Issues

1. **Type Conflicts**
   - Multiple Express type definition files causing conflicts
   - Inconsistent type augmentation between files
   - `any` types in Express request/response objects

2. **Middleware Duplication**
   - Similar middleware in different locations
   - Inconsistent error handling
   - No clear middleware execution order

3. **Performance**
   - Unnecessary middleware in some routes
   - No request/response compression
   - Missing proper CORS configuration

### Proposed Structure

```
server/
  src/
    common/
      middleware/
        auth/              # Authentication middleware
          index.ts
          jwt.middleware.ts
          session.middleware.ts
        
        validation/        # Request validation
          index.ts
          schema.validator.ts
          
        error/            # Error handling
          error.handler.ts
          not-found.handler.ts
          
        security/         # Security headers
          cors.middleware.ts
          helmet.middleware.ts
          rate-limit.middleware.ts
          
        logging/          # Request logging
          request.logger.ts
          response.logger.ts
    
    # Application entry point
    app.ts      # Express app setup and middleware registration
```

### Implementation Plan

1. **Consolidate Type Definitions**
   ```typescript
   // types/express/index.d.ts
   declare namespace Express {
     interface Request {
       // Standard properties
       requestId: string;
       user?: User;
       
       // Add any custom properties with proper types
       startTime: [number, number];
     }
   }
   ```

2. **Standardize Middleware**
   - Create a consistent middleware interface
   - Implement proper error handling
   - Add request/response logging

3. **Security Improvements**
   - Add Helmet for security headers
   - Configure CORS properly
   - Implement rate limiting

4. **Performance Optimizations**
   - Add response compression
   - Implement request validation
   - Optimize middleware order

### Migration Steps

1. **Phase 1: Setup**
   - [ ] Consolidate type definitions
   - [ ] Set up middleware directory structure
   - [ ] Configure base Express app

2. **Phase 2: Core Middleware**
   - [ ] Implement auth middleware
   - [ ] Add error handling
   - [ ] Set up request logging

3. **Phase 3: Security**
   - [ ] Add security headers
   - [ ] Configure CORS
   - [ ] Implement rate limiting

4. **Phase 4: Optimization**
   - [ ] Add response compression
   - [ ] Optimize middleware order
   - [ ] Add request validation

## Best Practices

### TypeScript Best Practices
1. **Use `interface` for Public APIs**
   ```typescript
   // Good
   interface User {
     id: string;
     name: string;
   }
   
   // Avoid
   type User = {
     id: string;
     name: string;
   }
   ```

2. **Use `type` for Complex Types**
   ```typescript
   // Good
   type UserRole = 'admin' | 'user' | 'guest';
   type Nullable<T> = T | null;
   
   // Avoid
   interface UserRole {
     [key: string]: boolean;
   }
   ```

3. **Avoid `any` Type**
   ```typescript
   // Bad
   function process(data: any) { ... }
   
   // Good
   function process<T>(data: T): ProcessedData<T> { ... }
   
   // Better with runtime validation
   function process(data: unknown): ProcessedData {
     if (!isValidData(data)) {
       throw new Error('Invalid data');
     }
     // data is now properly typed
   }
   ```

### Error Handling
1. **Use Custom Error Classes**
   ```typescript
   export class AppError extends Error {
     constructor(
       message: string,
       public statusCode: number = 500,
       public details?: any
     ) {
       super(message);
       Error.captureStackTrace(this, this.constructor);
     }
   }
   
   // Usage
   throw new AppError('User not found', 404);
   ```

2. **Global Error Handler**
   ```typescript
   app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
     if (err instanceof AppError) {
       return res.status(err.statusCode).json({
         error: {
           message: err.message,
           details: err.details,
         },
       });
     }
     
     // Log unexpected errors
     console.error('Unexpected error:', err);
     
     res.status(500).json({
       error: {
         message: 'Internal Server Error',
         ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
       },
     });
   });
   ```

### Testing
1. **Unit Tests**
   ```typescript
   describe('UserService', () => {
     let service: UserService;
     let repository: jest.Mocked<UserRepository>;
     
     beforeEach(() => {
       repository = {
         findById: jest.fn(),
         create: jest.fn(),
       } as any;
       
       service = new UserService(repository);
     });
     
     it('should find user by id', async () => {
       const mockUser = { id: '1', name: 'Test User' };
       repository.findById.mockResolvedValue(mockUser);
       
       const user = await service.getUser('1');
       expect(user).toEqual(mockUser);
       expect(repository.findById).toHaveBeenCalledWith('1');
     });
   });
   ```

## Implementation Checklist

### API Design Principles

#### Simplified API Structure
- [ ] Use clean, semantic URLs without versioning
  ```typescript
  // server/src/app.module.ts
  @Module({
    imports: [
      RouterModule.register([
        {
          path: 'api',
          children: [
            {
              path: 'users',
              module: UsersModule,
            },
            // Other modules
          ],
        },
      ]),
    ],
  })
  export class AppModule {}
  ```

#### Consistent Response Format
- [ ] Standardize API responses
  ```typescript
  // shared/src/types/api/response.ts
  export interface ApiResponse<T> {
    data: T;
    meta: {
      requestId: string;
      timestamp: string;
    };
  }
  
  export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
  ```

#### Documentation
- [ ] Document API in OpenAPI format
  ```yaml
  # docs/openapi.yaml
  openapi: 3.0.0
  info:
    title: Travel API
    version: 1.0.0
    description: Modern travel booking API
  
  servers:
    - url: /api
      description: Main API server
  
  paths:
    /users:
      get:
        summary: Get all users
        responses:
          '200':
            description: List of users
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/UserList'
  ```

#### Client Integration
- [ ] Generate TypeScript client from OpenAPI spec
  ```bash
  # package.json
  {
    "scripts": {
      "generate-client": "openapi-typescript-codegen --input ./docs/openapi.yaml --output ./client/src/api"
    }
  }
  ```

### Database Migrations & Schema Management

#### Migration Setup
- [ ] Set up database migration tooling
  ```bash
  # Using Drizzle ORM for migrations
  pnpm add -D drizzle-kit
  
  # Add scripts to package.json
  {
    "scripts": {
      "db:generate": "drizzle-kit generate:pg",
      "db:migrate": "drizzle-kit migrate",
      "db:studio": "drizzle-kit studio"
    }
  }
  ```

#### Migration Best Practices
- [ ] Create migration files with timestamps
  ```typescript
  // migrations/20230627000000_create_users_table.ts
  import { sql } from 'drizzle-orm';
  import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
  
  export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    email: text('email').notNull().unique(),
    name: text('name'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // Add foreign key constraint
  await sql`
    ALTER TABLE users
    ADD CONSTRAINT fk_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE;
  `;
  ```

#### Schema Validation
- [ ] Add runtime schema validation
  ```typescript
  // server/src/common/validators/schema-validator.ts
  import { z } from 'zod';
  import { fromZodError } from 'zod-validation-error';
  
  export const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name too short'),
    tenantId: z.string().uuid('Invalid tenant ID'),
    role: z.enum(['admin', 'editor', 'viewer'])
  });
  
  export function validateUser(data: unknown) {
    try {
      return { data: userSchema.parse(data), error: null };
    } catch (err) {
      return { 
        data: null, 
        error: fromZodError(err as z.ZodError) 
      };
    }
  }
  ```

#### Database Health Checks
- [ ] Implement database health monitoring
  ```typescript
  // server/src/health/db.health.ts
  import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
  import { Injectable } from '@nestjs/common';
  import { DatabaseHealthIndicator } from './database.health';
  
  @Injectable()
  export class DBHealthService {
    constructor(
      private health: HealthCheckService,
      private db: DatabaseHealthIndicator,
    ) {}
    
    @HealthCheck()
    async check() {
      return this.health.check([
        () => this.db.pingCheck('database', { timeout: 300 }),
      ]);
    }
  }
  ```

### Security & Identity Handling Best Practices

#### Secure Identity Resolution
- [ ] Create a centralized identity context service
  ```typescript
  // server/src/common/context/identity-context.ts
  import { Request } from 'express';
  import { UnauthorizedError } from '../errors';
  
  export class IdentityContext {
    static getCurrentUser(req: Request) {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      return req.user; // From JWT/session
    }
    
    static getTenantId(req: Request) {
      const tenantId = req.tenant?.id || process.env.DEFAULT_TENANT_ID;
      if (!tenantId) {
        throw new Error('Tenant context not available');
      }
      return tenantId;
    }
    
    static hasRole(req: Request, requiredRole: string): boolean {
      const user = this.getCurrentUser(req);
      return user.roles?.includes(requiredRole) || false;
    }
  }
  ```

#### Forbidden Patterns (NEVER DO THIS)
```typescript
// ❌ BAD: Hardcoded values
const ADMIN_EMAIL = 'admin@example.com';
const ORG_SLUG = 'acme-corp';

// ❌ BAD: Direct database query without tenant context
await db.query('SELECT * FROM users WHERE email = ?', [email]);

// ❌ BAD: Hardcoded role checks
if (user.role === 'admin') { /* ... */ }
```

#### Required Patterns (ALWAYS DO THIS)
```typescript
// ✅ GOOD: Get from authenticated request
const currentUser = IdentityContext.getCurrentUser(req);
const tenantId = IdentityContext.getTenantId(req);

// ✅ GOOD: Always include tenant context in queries
await db.query(
  'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
  [userId, tenantId]
);

// ✅ GOOD: Use role constants and check permissions
import { UserRole } from '@shared/constants/roles';

if (IdentityContext.hasRole(req, UserRole.ADMIN)) {
  // Admin-specific logic
}
```

#### Environment Configuration
- [ ] Move all environment-specific values to `.env`
  ```env
  # .env.example
  DEFAULT_ADMIN_EMAIL=admin@example.com
  DEFAULT_ORG_SLUG=default-org
  
  # Role-based access control
  ADMIN_ROLES=admin,superadmin
  EDITOR_ROLES=editor,admin,superadmin
  VIEWER_ROLES=viewer,editor,admin,superadmin
  ```

#### Database Schema Requirements
- [ ] Ensure all user/org tables include tenant_id
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    -- other fields
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );
  ```

#### Code Review Checklist
- [ ] No hardcoded emails, user IDs, or organization references
- [ ] All database queries include tenant context
- [ ] Role checks use centralized constants
- [ ] Environment variables are properly validated
- [ ] Error messages don't leak sensitive information

### Phase 1: Project Setup (Days 1-2)

#### Shared Types Setup
- [ ] Create shared types directory structure
  ```
  shared/
    src/
      types/
        auth/
          user.types.ts
          session.types.ts
          index.ts          # Barrel file for auth types
        booking/
          booking.types.ts
          flight.types.ts
          hotel.types.ts
          index.ts         # Barrel file for booking types
        common/
          api.types.ts
          error.types.ts
          index.ts         # Barrel file for common types
        index.ts           # Main barrel file
  ```

- [ ] Set up path aliases in `tsconfig.json`
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@shared/*": ["shared/src/*"],
        "@server/*": ["server/src/*"]
      }
    }
  }
  ```

- [ ] Configure package.json exports
  ```json
  {
    "exports": {
      "./types/*": "./dist/types/*.d.ts"
    }
  }
  ```

#### Import Management
- [ ] Create/update barrel files after each type file
  ```typescript
  // shared/src/types/auth/index.ts
  export * from './user.types';
  export * from './session.types';
  
  // shared/src/types/index.ts
  export * from './auth';
  export * from './booking';
  export * from './common';
  ```

- [ ] Set up ESLint rule to enforce import from barrel files
  ```json
  {
    "rules": {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            "**/src/types/*/!(index)",
            "!@shared/types"
          ]
        }
      ]
    }
  }
  ```

#### Cleanup Tasks
- [ ] Delete old type files after migration
- [ ] Run type checking to catch any import issues
- [ ] Update any direct imports to use the new shared types
- [ ] Remove any unused type files with `npx tsc --noEmit --pretty`

### Phase 1.5: Verification (After Each Phase)
- [ ] Run type checking: `tsc --noEmit`
- [ ] Run linter: `eslint . --ext .ts,.tsx`
- [ ] Run tests: `jest`
- [ ] Verify all imports are using the new shared types
- [ ] Remove any deprecated type files
- [ ] Commit changes with clear message: "refactor: migrate [feature] types to shared"

### Phase 2: Core Infrastructure (Days 3-5)

#### Base Repository
- [ ] Create abstract base repository
  ```typescript
  // server/src/common/repositories/base.repository.ts
  export abstract class BaseRepository<T extends Entity> {
    constructor(
      protected readonly table: PgTable,
      protected readonly db: PostgresJsDatabase
    ) {}
    
    async findById(id: string): Promise<T | null> {
      // Implementation
    }
    
    // Add other common methods
  }
  ```

#### Import Management
- [ ] Create barrel file for repositories
  ```typescript
  // server/src/common/repositories/index.ts
  export * from './base.repository';
  export * from './interfaces';
  ```

- [ ] Update imports in dependent files
  ```typescript
  // Before
  import { BaseRepository } from '../../../common/repositories/base.repository';
  
  // After
  import { BaseRepository } from '@server/common/repositories';
  ```

#### Cleanup Tasks
- [ ] Remove any duplicate repository implementations
- [ ] Delete old repository files after migration
- [ ] Run type checking to verify all imports are correct
- [ ] Update any test files to use the new repository imports

### Phase 2.5: Verification
- [ ] Run type checking: `tsc --noEmit`
- [ ] Run linter: `eslint . --ext .ts,.tsx`
- [ ] Run tests: `jest`
- [ ] Verify all repository imports are using the new paths
- [ ] Remove any deprecated repository files
- [ ] Commit changes: "refactor: implement base repository pattern"

#### Error Handling
- [ ] Create custom error classes
  ```typescript
  export class AppError extends Error {
    constructor(
      message: string,
      public statusCode: number = 500,
      public details?: any
    ) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
    }
  }
  ```

#### Request Validation
- [ ] Set up Zod validation
  ```typescript
  import { z } from 'zod';
  
  export const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
  });
  
  export type CreateUserDto = z.infer<typeof createUserSchema>;
  ```

### Phase 3: Authentication & Security (Days 6-7)

#### JWT Authentication
- [ ] Implement JWT middleware
  ```typescript
  // server/src/common/middleware/auth/jwt.middleware.ts
  export const authenticateJWT = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // JWT verification logic
  };
  ```

#### Session Management
- [ ] Set up session store
  ```typescript
  // server/src/app.ts
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient })
  }));
  ```

#### Rate Limiting
- [ ] Add rate limiting
  ```typescript
  // server/src/common/middleware/security/rate-limit.middleware.ts
  export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  
  // In app.ts
  app.use('/api/', apiLimiter);
  ```

#### Import Management
- [ ] Create barrel files for middleware
  ```typescript
  // server/src/common/middleware/index.ts
  export * from './auth/jwt.middleware';
  export * from './security/rate-limit.middleware';
  export * from './security/cors.middleware';
  ```

- [ ] Update app.ts to use new imports
  ```typescript
  // Before
  import { authenticateJWT } from './middleware/auth/jwt.middleware';
  
  // After
  import { authenticateJWT } from '@server/common/middleware';
  ```

#### Cleanup Tasks
- [ ] Remove any old authentication middleware
- [ ] Delete deprecated security-related files
- [ ] Update test files to use new import paths
- [ ] Verify all security headers are properly set

### Phase 3.5: Verification
- [ ] Run security audit: `npm audit`
- [ ] Test authentication flows
- [ ] Verify rate limiting is working
- [ ] Check for any mixed content warnings
- [ ] Commit changes: "refactor: implement authentication & security middleware"

### Phase 4: API Implementation (Days 8-12)

#### File Structure
```
server/
  src/
    modules/
      users/
        users.controller.ts
        users.service.ts
        users.router.ts
        users.schemas.ts
        __tests__/
          users.controller.test.ts
          users.service.test.ts
      bookings/
        bookings.controller.ts
        bookings.service.ts
        bookings.router.ts
        bookings.schemas.ts
        __tests__/
          bookings.controller.test.ts
          bookings.service.test.ts
```

#### User Endpoints
- [ ] Implement user registration
  ```typescript
  // server/src/modules/users/users.router.ts
  import { Router } from 'express';
  import { validate } from '@server/common/middleware';
  import { createUserSchema } from './users.schemas';
  import * as usersController from './users.controller';

  const router = Router();

  router.post('/register', 
    validate(createUserSchema),
    usersController.register
  );
  
  export default router;
  ```

- [ ] Add user profile endpoints
  ```typescript
  // server/src/modules/users/users.controller.ts
  import { Request, Response } from 'express';
  import { AuthenticatedRequest } from '@shared/types/express';
  import * as usersService from './users.service';

  export const getProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const user = await usersService.getUserById(req.user.id);
    res.json(user);
  };
  ```

#### Booking Endpoints
- [ ] Create booking endpoints
  ```typescript
  // server/src/modules/bookings/bookings.router.ts
  import { Router } from 'express';
  import { authenticateJWT, validate } from '@server/common/middleware';
  import { createBookingSchema } from './bookings.schemas';
  import * as bookingsController from './bookings.controller';

  const router = Router();

  router.post('/',
    authenticateJWT,
    validate(createBookingSchema),
    bookingsController.createBooking
  );
  
  export default router;
  ```

#### Import Management
- [ ] Create barrel files for each module
  ```typescript
  // server/src/modules/users/index.ts
  export * from './users.controller';
  export * from './users.service';
  export * from './users.router';
  export * from './users.schemas';
  ```

- [ ] Update app.ts to use modular routes
  ```typescript
  // server/src/app.ts
  import usersRouter from '@server/modules/users';
  import bookingsRouter from '@server/modules/bookings';

  const app = express();
  
  // ... other middleware ...
  
  app.use('/api/users', usersRouter);
  app.use('/api/bookings', bookingsRouter);
  ```

#### Cleanup Tasks
- [ ] Remove old route handlers and controllers
- [ ] Delete deprecated API endpoint files
- [ ] Update test files to use new module structure
- [ ] Verify all API endpoints are properly documented

### Phase 4.5: Verification
- [ ] Run API tests: `npm test`
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Verify OpenAPI/Swagger documentation
- [ ] Check for any 404s or broken links
- [ ] Commit changes: "refactor: implement modular API structure"

### Phase 5: Testing (Days 13-15)

#### Test Structure
```
tests/
  unit/
    repositories/
      user.repository.test.ts
    services/
      user.service.test.ts
  integration/
    api/
      auth.test.ts
      bookings.test.ts
  e2e/
    user-journey.test.ts
  test-utils/
    test-client.ts
    test-db.ts
```

#### Unit Tests
- [ ] Write repository tests
  ```typescript
  // tests/unit/repositories/user.repository.test.ts
  import { UserRepository } from '@server/modules/users/user.repository';
  import { Test, TestingModule } from '@nestjs/testing';
  import { getRepositoryToken } from '@nestjs/typeorm';

  describe('UserRepository', () => {
    let repository: UserRepository;
    let mockRepository: jest.Mocked<any>;

    beforeEach(async () => {
      mockRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserRepository,
          {
            provide: getRepositoryToken(User),
            useValue: mockRepository,
          },
        ],
      }).compile();

      repository = module.get<UserRepository>(UserRepository);
    });

    it('should create a user', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      mockRepository.save.mockResolvedValue({ id: 1, ...userData });
      
      const result = await repository.createUser(userData);
      
      expect(result).toHaveProperty('id');
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(userData)
      );
    });
  });
  ```

#### Integration Tests
- [ ] Test API endpoints
  ```typescript
  // tests/integration/api/auth.test.ts
  import { Test, TestingModule } from '@nestjs/testing';
  import { INestApplication } from '@nestjs/common';
  import * as request from 'supertest';
  import { AppModule } from '@server/app.module';
  import { TestDatabase } from '../test-utils/test-db';

  describe('Auth API (e2e)', () => {
    let app: INestApplication;
    let testDb: TestDatabase;

    beforeAll(async () => {
      testDb = new TestDatabase();
      await testDb.setupTestDatabase();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
      await testDb.teardownTestDatabase();
    });

    it('/auth/register (POST) - should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body).not.toHaveProperty('password');
    });
  });
  ```

#### Test Utilities
- [ ] Create test database utilities
  ```typescript
  // tests/test-utils/test-db.ts
  import { DataSource } from 'typeorm';
  import { config } from 'dotenv';
  
  config();
  
  export class TestDatabase {
    private testConnection: DataSource;
    private testDbName: string;

    async setupTestDatabase() {
      this.testDbName = `test_${Date.now()}`;
      
      // Create test database
      const connection = new DataSource({
        type: 'postgres',
        host: process.env.TEST_DB_HOST,
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        username: process.env.TEST_DB_USERNAME,
        password: process.env.TEST_DB_PASSWORD,
        database: 'postgres', // Connect to default DB to create test DB
      });
      
      await connection.initialize();
      await connection.query(`CREATE DATABASE ${this.testDbName}`);
      await connection.destroy();
      
      // Initialize test connection
      this.testConnection = new DataSource({
        // ... same config but with test database name
        database: this.testDbName,
        synchronize: true,
        dropSchema: true,
        entities: [/* your entities */],
      });
      
      await this.testConnection.initialize();
      return this.testConnection;
    }
    
    async teardownTestDatabase() {
      if (this.testConnection?.isInitialized) {
        await this.testConnection.destroy();
      }
      
      // Drop test database
      const connection = new DataSource({
        /* same as setup */
      });
      
      await connection.initialize();
      await connection.query(`DROP DATABASE IF EXISTS ${this.testDbName}`);
      await connection.destroy();
    }
  }
  ```

#### Test Coverage
- [ ] Add test coverage reporting
  ```json
  // package.json
  {
    "scripts": {
      "test:cov": "jest --coverage",
      "test:watch": "jest --watch",
      "test:e2e": "jest --config ./test/jest-e2e.json"
    }
  }
  ```

#### Cleanup Tasks
- [ ] Remove any test.only or describe.only statements
- [ ] Clean up test data after each test
- [ ] Ensure all tests are independent
- [ ] Document how to run specific test suites

### Phase 5.5: Verification
- [ ] Run test coverage: `npm run test:cov`
- [ ] Verify minimum coverage thresholds are met
- [ ] Check for any flaky tests
- [ ] Document test patterns and best practices
- [ ] Commit changes: "test: add comprehensive test suite"

### Phase 6: Documentation & Polish (Days 16-17)

#### Documentation Structure
```
docs/
  api/
    openapi.yaml
    examples/
      auth/
        login.http
        register.http
  guides/
    getting-started.md
    authentication.md
    deployment.md
  architecture/
    high-level-architecture.png
    database-schema.md
  diagrams/
    sequence-diagrams/
      user-registration.puml
      booking-flow.puml
```

#### API Documentation
- [ ] Generate OpenAPI docs with examples
  ```yaml
  # docs/api/openapi.yaml
  openapi: 3.0.0
  info:
    title: Travel API
    version: 1.0.0
    description: |
      ## Overview
      Comprehensive API for managing travel bookings, user accounts, and more.
      
      ## Authentication
      - **Bearer Token**: Required for authenticated endpoints
      - **Rate Limiting**: 100 requests per 15 minutes per IP
      
      ## Error Handling
      All error responses follow the format:
      ```json
      {
        "statusCode": 400,
        "message": "Validation error",
        "errors": ["email must be an email"]
      }
      ```
  
  servers:
    - url: https://api.travelapp.com/v1
      description: Production server
    - url: http://localhost:3000/v1
      description: Development server
  
  components:
    securitySchemes:
      bearerAuth:
        type: http
        scheme: bearer
        bearerFormat: JWT
    
    responses:
      UnauthorizedError:
        description: Unauthorized
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      
    schemas:
      User:
        type: object
        properties:
          id:
            type: string
            format: uuid
          email:
            type: string
            format: email
          name:
            type: string
            nullable: true
          createdAt:
            type: string
            format: date-time
  
  paths:
    /auth/register:
      post:
        tags: [Authentication]
        summary: Register a new user
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterRequest'
        responses:
          '201':
            description: User registered successfully
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/User'
  ```

- [ ] Add example requests
  ```http
  # docs/api/examples/auth/register.http
  POST http://localhost:3000/api/v1/auth/register
  Content-Type: application/json
  
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }
  ```

#### Project Documentation
- [ ] Update README.md
  ```markdown
  # Travel Booking Platform
  
  ## Features
  - ✈️ Flight bookings
  - 🏨 Hotel reservations
  - 🔐 JWT Authentication
  - 📱 Responsive UI
  - 🧪 90%+ Test Coverage
  
  ## Quick Start
  
  ### Prerequisites
  - Node.js 18+
  - PostgreSQL 14+
  - pnpm
  
  ### Installation
  ```bash
  # Clone the repository
  git clone https://github.com/yourusername/travel-booking.git
  cd travel-booking
  
  # Install dependencies
  pnpm install
  
  # Set up environment variables
  cp .env.example .env
  # Edit .env with your configuration
  
  # Run migrations
  pnpm db:migrate
  
  # Start development server
  pnpm dev
  ```
  
  ### Available Scripts
  ```bash
  # Start development server
  pnpm dev
  
  # Run tests
  pnpm test
  
  # Run tests with coverage
  pnpm test:cov
  
  # Run linter
  pnpm lint
  
  # Run type checking
  pnpm typecheck
  ```
  
  ## Documentation
  - [API Reference](/docs/api/README.md)
  - [Architecture](/docs/architecture/README.md)
  - [Deployment Guide](/docs/guides/deployment.md)
  
  ## Contributing
  Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct,
  and the process for submitting pull requests.
  
  ## License
  This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
  ```

#### Cleanup Tasks
- [ ] Remove any TODO comments that were addressed
- [ ] Update all code comments for accuracy
- [ ] Ensure all environment variables are documented in .env.example
- [ ] Verify all documentation links are working

### Phase 6.5: Verification
- [ ] Run documentation build: `pnpm build:docs`
- [ ] Check for broken links: `pnpm check:links`
- [ ] Verify all examples in documentation work
- [ ] Ensure README has clear setup instructions
- [ ] Commit changes: "docs: update project documentation"

### Phase 7: Deployment & Production Readiness (Days 18-20)

#### Infrastructure as Code (IaC)
- [ ] Set up Terraform for cloud resources
  ```hcl
  # infrastructure/main.tf
  provider "aws" {
    region = var.aws_region
  }
  
  module "ecs_cluster" {
    source  = "terraform-aws-modules/ecs/aws"
    version = "~> 5.0"
    
    cluster_name = "travel-app-${var.environment}"
    
    # Auto-scaling configuration
    autoscaling_capacity_providers = {
      ec2 = {
        auto_scaling_group_arn = module.autoscaling.autoscaling_group_arn
      }
    }
  }
  ```

#### CI/CD Pipeline
- [ ] Set up GitHub Actions workflow
  ```yaml
  # .github/workflows/deploy.yml
  name: Deploy to Production
  
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  
  env:
    AWS_REGION: us-east-1
    ECR_REPOSITORY: travel-app
    ECS_SERVICE: travel-app-service
    ECS_CLUSTER: travel-app-production
    ECS_TASK_DEFINITION: .aws/task-definition.json
  
  jobs:
    deploy:
      name: Deploy
      runs-on: ubuntu-latest
      
      steps:
        - name: Checkout
          uses: actions/checkout@v3
        
        - name: Configure AWS credentials
          uses: aws-actions/configure-aws-credentials@v1
          with:
            aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
            aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            aws-region: ${{ env.AWS_REGION }}
        
        - name: Login to Amazon ECR
          id: login-ecr
          uses: aws-actions/amazon-ecr-login@v1
        
        - name: Build, tag, and push image to Amazon ECR
          id: build-image
          env:
            ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
            IMAGE_TAG: ${{ github.sha }}
          run: |
            docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
            docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
            echo "::set-output name=image::$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
        
        - name: Deploy to Amazon ECS
          uses: aws-actions/amazon-ecs-deploy-task-definition@v1
          with:
            task-definition: ${{ env.ECS_TASK_DEFINITION }}
            service: ${{ env.ECS_SERVICE }}
            cluster: ${{ env.ECS_CLUSTER }}
            wait-for-service-stability: true
  ```

#### Monitoring & Observability
- [ ] Set up monitoring with Prometheus and Grafana
  ```yaml
  # docker-compose.monitoring.yml
  version: '3.8'
  
  services:
    prometheus:
      image: prom/prometheus:latest
      ports:
        - "9090:9090"
      volumes:
        - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      command:
        - '--config.file=/etc/prometheus/prometheus.yml'
  
    grafana:
      image: grafana/grafana:latest
      ports:
        - "3000:3000"
      volumes:
        - grafana-storage:/var/lib/grafana
      environment:
        - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
  
  volumes:
    grafana-storage:
  ```

#### Security Hardening
- [ ] Add security headers middleware
  ```typescript
  // server/src/common/middleware/security/headers.middleware.ts
  import { RequestHandler } from 'express';
  import helmet from 'helmet';
  
  export const securityHeaders: RequestHandler = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS filter in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Configure Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.example.com; " +
      "style-src 'self' 'unsafe-inline' cdn.example.com; " +
      "img-src 'self' data: blob: cdn.example.com; " +
      "font-src 'self' cdn.example.com; " +
      "connect-src 'self' api.example.com;"
    );
    
    next();
  };
  
  // Apply security headers using helmet
  export const helmetMiddleware = helmet({
    contentSecurityPolicy: false, // We're setting CSP manually
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  });
  ```

#### Performance Optimization
- [ ] Implement response compression
  ```typescript
  // server/src/app.ts
  import compression from 'compression';
  
  const app = express();
  
  // Enable gzip compression
  app.use(compression({
    level: 6, // Level of compression (0-9, where 9 is maximum)
    threshold: '1kb', // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses if the client explicitly doesn't accept gzip
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));
  ```

#### Cleanup Tasks
- [ ] Remove development dependencies from production
  ```bash
  pnpm prune --prod
  ```
- [ ] Minify and bundle frontend assets
- [ ] Enable production mode in all frameworks
- [ ] Set appropriate cache headers

### Phase 7.5: Final Verification
- [ ] Run security audit: `npm audit --production`
- [ ] Load test critical paths
- [ ] Verify all environment-specific configurations
- [ ] Test rollback procedures
- [ ] Document deployment runbook
- [ ] Commit changes: "chore: prepare for production deployment"
  name: CI/CD
  
  on: [push]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v2
        - uses: actions/setup-node@v2
          with:
            node-version: '18'
        - run: pnpm install
        - run: pnpm test
  ```

#### Deployment Configuration
- [ ] Set up Docker
  ```dockerfile
  FROM node:18-alpine
  
  WORKDIR /app
  COPY package.json pnpm-lock.yaml ./
  RUN pnpm install --frozen-lockfile
  
  COPY . .
  RUN pnpm build
  
  CMD ["node", "dist/main.js"]
  ```

## Next Steps

1. **Immediate Actions**
   - Set up shared types directory
   - Configure path aliases
   - Add base repository implementation

2. **Short-term Goals**
   - Implement authentication
   - Set up error handling
   - Add request validation

3. **Long-term Goals**
   - Add comprehensive testing
   - Improve documentation
   - Optimize performance

1. Review and approve the proposed structure
2. Start with Phase 1 implementation
3. Set up linting rules to enforce type imports from shared locations
