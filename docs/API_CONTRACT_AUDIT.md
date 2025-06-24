# API Contract Audit Report

## Overview
This document tracks the audit and standardization of API contracts across the application.

## Current State

### 1. Type Definitions
- **Client**: Uses custom types in `client/src/types/api.ts`
- **Server**: Defines DTOs in `server/src/auth/dto/*.ts`
- **Shared**: Types in `@shared/types/auth/*` (partially implemented)

### 2. Authentication Endpoints

#### Login (`POST /api/auth/login`)
- **Request**:
  ```typescript
  interface LoginRequest {
    email: string;
    password: string;
  }
  ```
- **Response (Success)**:
  ```typescript
  interface LoginResponse {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: UserRole;
      // ... other user fields
    };
  }
  ```
- **Response (Error)**:
  ```typescript
  interface ErrorResponse {
    error: string;
    code?: string;
    message?: string;
    expired?: boolean;
  }
  ```
- **Notes**:
  - Sets HTTP-only refresh token cookie
  - Rate limited
  - Uses shared `LoginDto`

#### Refresh Token (`POST /api/auth/refresh-token`)
- **Request**: 
  - Expects refresh token in cookie or body
  - No body required if using cookie
- **Response**: Same as login response
- **Notes**:
  - Updates refresh token cookie
  - Validates existing refresh token

#### Logout (`POST /api/auth/logout`)
- **Request**: 
  - Requires refresh token in cookie or body
  - Requires valid access token in Authorization header
- **Response**:
  ```typescript
  {
    success: boolean;
  }
  ```
- **Notes**:
  - Invalidates the refresh token
  - Clears refresh token cookie

#### Register (`POST /api/auth/register`)
- **Request**:
  ```typescript
  interface RegisterRequest {
    email: string;           // Required, must be valid email
    password: string;        // Required, 8-50 chars, must meet complexity
    firstName: string;       // Required, max 50 chars
    lastName?: string;       // Optional, max 50 chars
    displayName?: string;    // Optional
    organizationId?: string; // Optional, required if role is provided
    role?: UserRole;         // Optional, defaults to 'member'
    acceptTerms?: boolean;   // Optional
    inviteToken?: string;    // Optional, for organization invites
  }
  ```
- **Response (Success)**: Same as login response
- **Response (Error)**: Standard error response
- **Notes**:
  - Creates new user account
  - Auto-logs in user on success
  - Rate limited

#### Request Password Reset (`POST /api/auth/request-password-reset`)
- **Request**:
  ```typescript
  interface RequestPasswordResetRequest {
    email: string;  // Required, user's email
  }
  ```
- **Response (Success)**:
  ```typescript
  {
    success: boolean;
    message: string;  // Success message
  }
  ```
- **Notes**:
  - Always returns 200 even if email doesn't exist
  - Sends password reset email if account exists
  - Rate limited

#### Reset Password (`POST /api/auth/reset-password`)
- **Request**:
  ```typescript
  interface ResetPasswordRequest {
    token: string;      // Password reset token from email
    newPassword: string; // New password (must meet requirements)
  }
  ```
- **Response (Success)**:
  ```typescript
  {
    success: boolean;
    message: string;  // Success message
  }
  ```
- **Notes**:
  - Invalidates the reset token after use
  - Updates user's password

#### Logout All Devices (`POST /api/auth/logout-all`)
- **Request**:
  - Requires valid access token in Authorization header
- **Response**:
  ```typescript
  {
    success: boolean;
  }
  ```
- **Notes**:
  - Invalidates all refresh tokens for the user
  - Clears refresh token cookie on current device

## API Versioning Strategy

### Current Implementation
- **URL Prefix**: `/api/v1/` for all v1 endpoints
- **Version Headers**:
  - `API-Version`: Current API version (e.g., 'v1')
  - `API-Supported-Versions`: Lists supported versions (currently only 'v1')
- **Placeholder for v2**: Returns 501 Not Implemented
- **No Content Negotiation**: No `Accept-Version` header support
- **No Request/Response Versioning**: No versioning of individual DTOs

### Versioning Gaps
1. **No Content Negotiation**: Cannot request specific versions via headers
2. **Limited Client Flexibility**: Clients must use URL versioning
3. **No Deprecation Policy**: No clear deprecation timeline for old versions
4. **No Request/Response Versioning**: Cannot evolve DTOs independently
5. **No Semantic Versioning**: No distinction between breaking and non-breaking changes

### Recommendations
1. **Implement Content Negotiation**:
   ```http
   GET /api/endpoint
   Accept: application/json;version=1.0
   ```

2. **Add Deprecation Headers**:
   ```http
   Deprecation: true
   Sunset: Wed, 01 Jan 2025 00:00:00 GMT
   Link: </api/v2/endpoint>; rel="successor-version"
   ```

3. **Version DTOs Independently**:
   ```typescript
   // v1/user.dto.ts
   export class UserDto { /* v1 fields */ }
   
   // v2/user.dto.ts
   export class UserDto { /* v2 fields */ }
   ```

4. **Document Versioning Strategy**:
   - Document supported versions
   - Define deprecation policy
   - Document breaking changes

5. **Add Request/Response Versioning**:
   ```typescript
   interface ApiResponse<T> {
     apiVersion: string;
     data: T;
   }
   ```

## Error Handling

### Current Implementation
- **Centralized Error Service**:
  - `ErrorService` provides standardized error creation and handling
  - Consistent error types and formats across the application
  - Integrated with logging system

- **Error Types**:
  | Status | Code | Description |
  |--------|------|-------------|
  | 400 | `BAD_REQUEST` | Invalid request data or parameters |
  | 401 | `UNAUTHORIZED` | Authentication required or invalid credentials |
  | 403 | `FORBIDDEN` | Insufficient permissions |
  | 404 | `NOT_FOUND` | Requested resource not found |
  | 409 | `CONFLICT` | Resource conflict (e.g., duplicate entry) |
  | 500 | `INTERNAL_SERVER_ERROR` | Server-side error |

- **Error Response Format**:
  ```typescript
  interface ApiError {
    status: number;           // HTTP status code
    code: string;            // Error code (e.g., 'UNAUTHORIZED')
    message: string;         // Human-readable error message
    details?: {              // Additional error details (optional)
      [key: string]: unknown;
    };
    stack?: string;          // Stack trace (development only)
  }
  ```

- **Example Error Response**:
  ```json
  {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": {
      "userId": "12345",
      "resource": "User"
    }
  }
  ```

### Error Handling Utilities

1. **Error Service** (`ErrorService`):
   - Centralized error creation and handling
   - Standardized error types and formats
   - Logging integration

2. **Error Utils** (`error-utils.ts`):
   - Type guards for error handling
   - Error formatting and classification
   - Development vs. production error handling

### Best Practices

1. **Client-Side Handling**:
   - Check HTTP status code first
   - Use error codes for conditional logic
   - Display user-friendly messages
   - Log detailed errors for debugging

2. **Server-Side Handling**:
   - Use appropriate HTTP status codes
   - Provide meaningful error messages
   - Include relevant error details
   - Log errors with context

3. **Security Considerations**:
   - Don't leak sensitive information in error responses
   - Sanitize error messages in production
   - Rate limit error responses to prevent enumeration attacks

### Recommended Improvements

1. **Standardize Error Categories**:
   ```typescript
   enum ErrorCategory {
     VALIDATION = 'VALIDATION',
     AUTHENTICATION = 'AUTHENTICATION',
     AUTHORIZATION = 'AUTHORIZATION',
     NOT_FOUND = 'NOT_FOUND',
     CONFLICT = 'CONFLICT',
     RATE_LIMIT = 'RATE_LIMIT',
     EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
     INTERNAL = 'INTERNAL'
   }
   ```

2. **Add Error Documentation**:
   - Document all possible error codes
   - Include error resolution steps
   - Provide examples for common errors

3. **Enhance Error Context**:
   - Add request IDs for tracing
   - Include timestamps for debugging
   - Add documentation links for common issues

## Request/Response Validation

### Current Implementation

#### 1. Class-Validator (Primary)
- **Location**: `common/pipes/validation.pipe.ts`
- **Features**:
  - Decorator-based validation
  - Automatic DTO transformation
  - Whitelisting of properties
  - Nested object validation
  - Custom validation decorators

**Example DTO**:
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}
```

#### 2. Zod (Secondary)
- **Location**: `auth/middleware/validation.middleware.ts`
- **Features**:
  - Schema-based validation
  - Type inference
  - Complex validation rules
  - Custom error messages

**Example Schema**:
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  })
});
```

#### 3. Manual Validation
- **Location**: Various service methods
- **Features**:
  - Business rule validation
  - Database-level constraints
  - Custom validation logic

### Validation Pipeline

1. **Request Validation**:
   - Input sanitization
   - Type conversion
   - Required field checks
   - Format validation

2. **Business Validation**:
   - Domain rules
   - Cross-field validation
   - Database consistency checks

3. **Response Validation**:
   - Data transformation
   - Field filtering
   - Type safety

### Recommended Improvements

1. **Standardize Validation Approach**:
   - Choose between class-validator and Zod
   - Create shared validation schemas
   - Document validation rules

2. **Enhance Validation**:
   - Add request/response validation middleware
   - Implement input sanitization
   - Add rate limiting for validation endpoints

3. **Improve Error Messages**:
   - Consistent error format
   - Localization support
   - Documentation links

4. **Performance Optimization**:
   - Cache validation schemas
   - Optimize validation order
   - Lazy loading of validators

### Example Implementation

```typescript
// Shared validation schemas
import { z } from 'zod';

export const userSchemas = {
  create: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['USER', 'ADMIN']).default('USER')
  }),
  update: z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['USER', 'ADMIN']).optional()
  })
};

// Usage in controller
@Post()
@UsePipes(new ZodValidationPipe(userSchemas.create))
async createUser(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

## Endpoint Patterns

### Trips Endpoint (`/trips`)

#### Authentication & Authorization
- **JWT Authentication**: All routes require a valid JWT token
- **Organization Context**: Injected via middleware for multi-tenancy
- **Role-Based Access Control**:
  - `super_admin`: Full access to all trips
  - Organization members: Access to their organization's trips
  - Individual users: Access to their own trips

#### Request Validation
- **Zod Schemas**: Used for request validation
- **Common Validations**:
  ```typescript
  // ID parameter validation
  const idParamSchema = z.object({
    id: z.string().uuid({ message: "ID must be a valid UUID" })
  });

  // Trip ID parameter validation
  const tripIdParamSchema = z.object({
    tripId: z.string().uuid({ message: "Trip ID must be a valid UUID" })
  });
  ```

#### Route Structure
```typescript
// Apply global middleware
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(fieldTransformMiddleware);

// GET /trips - Get all trips for authenticated user
router.get('/', (req, res) => tripController.getTrips(req, res));

// GET /trips/corporate - Get corporate trips
router.get('/corporate', (req, res) => tripController.getCorporateTrips(req, res));

// GET /trips/:id/todos - Get todos for a trip
router.get('/:id/todos', 
  validateAndSanitizeRequest({ params: idParamSchema }),
  async (req, res) => {
    // Implementation
  }
);
```

#### Response Patterns
1. **Success Response**:
   ```typescript
   {
     success: true,
     data: T,
     meta?: {
       total?: number,
       page?: number,
       limit?: number
     }
   }
   ```

2. **Error Response**:
   ```typescript
   {
     success: false,
     error: {
       code: string,
       message: string,
       details?: object
     }
   }
   ```

#### Best Practices
1. **Middleware Usage**:
   - Authentication middleware for all routes
   - Organization context injection
   - Field transformation
   - Request validation

2. **Error Handling**:
   - Consistent error responses
   - Proper HTTP status codes
   - Detailed error messages in development

3. **Performance**:
   - Field selection
   - Pagination support
   - Caching where appropriate

### Bookings Endpoint (`/bookings`)

#### Database Integration
- **ORM**: Uses Drizzle ORM for type-safe database operations
- **Soft Deletes**: Implements soft deletes with `status` and `cancelledAt` fields
- **Transactions**: Supports atomic operations for data consistency

#### Type Safety
- **TypeScript Integration**:
  ```typescript
  // Strongly typed database models
  type Booking = InferSelectModel<typeof bookings>;
  
  // Type-safe query building
  const booking = await db.query.bookings.findFirst({
    where: { id: bookingId }
  });
  ```

#### Authentication & Authorization
- **JWT Authentication**: Required for all endpoints
- **Organization Isolation**: Ensures users can only access their organization's data
- **Role-Based Access**: Different permissions based on user roles

#### Endpoint Structure
```typescript
// GET /bookings - Get all bookings
router.get('/', getBookingsHandler);

// GET /bookings/:bookingId - Get booking by ID
router.get('/:bookingId', getBookingByIdHandler);

// POST /bookings - Create a new booking
router.post('/', createBookingHandler);

// PUT /bookings/:bookingId - Update a booking
router.put('/:bookingId', updateBookingHandler);

// DELETE /bookings/:bookingId - Soft delete a booking
router.delete('/:bookingId', deleteBookingHandler);
```

#### Request/Response Examples

1. **Create Booking**
   ```http
   POST /bookings
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "tripId": "123e4567-e89b-12d3-a456-426614174000",
     "type": "flight",
     "details": { /* booking-specific details */ }
   }
   ```

   **Success Response (201 Created)**
   ```json
   {
     "success": true,
     "data": {
       "id": "123e4567-e89b-12d3-a456-426614174000",
       "tripId": "123e4567-e89b-12d3-a456-426614174000",
       "type": "flight",
       "status": "confirmed",
       "createdAt": "2023-01-01T00:00:00.000Z"
     }
   }
   ```

2. **Error Response (404 Not Found)**
   ```json
   {
     "success": false,
     "error": {
       "code": "NOT_FOUND",
       "message": "Booking not found"
     }
   }
   ```

#### Best Practices
1. **Data Validation**:
   - Input validation using Zod schemas
   - Type coercion for request parameters
   - Sanitization of user input

2. **Error Handling**:
   - Consistent error response format
   - Proper HTTP status codes
   - Detailed error messages in development

3. **Performance**:
   - Efficient database queries
   - Pagination for list endpoints
   - Caching where appropriate

### Organizations Endpoint (`/organizations`)

#### Multi-tenancy & Access Control
- **Organization Isolation**:
  - Data scoped by organization ID
  - Role-based access control (RBAC)
  - Permission-based endpoint access

- **Permission System**:
  ```typescript
  // Example permission checks
  router.get('/:id', requireOrgPermission('view_organization'), ...);
  router.put('/:id', requireOrgPermission('manage_organization'), ...);
  ```

#### Endpoint Structure
```typescript
// Organization Management
router.get('/:id', getOrganizationHandler);
router.put('/:id', updateOrganizationHandler);

// Member Management
router.get('/:id/members', listMembersHandler);
router.post('/:id/members', inviteMemberHandler);
router.put('/:id/members/:userId', updateMemberHandler);
router.delete('/:id/members/:userId', removeMemberHandler);

// Utility Endpoints
router.get('/users', listOrganizationUsersHandler);
```

#### Request/Response Examples

1. **List Organization Members**
   ```http
   GET /organizations/123/members
   Authorization: Bearer <token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": [
       {
         "id": "user-123",
         "email": "user@example.com",
         "role": "admin",
         "permissions": ["manage_organization", "manage_members"]
       }
     ]
   }
   ```

2. **Invite Member**
   ```http
   POST /organizations/123/members
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "email": "new.user@example.com",
     "role": "member"
   }
   ```

   **Success Response (201 Created)**
   ```json
   {
     "success": true,
     "data": {
       "id": "invite-456",
       "email": "new.user@example.com",
       "status": "pending",
       "invitedBy": "user-123",
       "invitedAt": "2023-01-01T00:00:00.000Z"
     }
   }
   ```

#### Best Practices
1. **Security**:
   - Validate organization ownership
   - Implement role-based access control
   - Use permission checks for sensitive operations

2. **Validation**:
   - Input validation for all parameters
   - Organization ID type safety
   - Email format validation

3. **Idempotency**:
   - Safe retry for member invitations
   - Duplicate detection
   - Idempotency keys for write operations

### Notifications Endpoint (`/notifications`)

#### Real-time Communication
- **WebSocket Integration**:
  - Real-time notification delivery
  - Live unread count updates
  - Connection status tracking

- **Notification Types**:
  ```typescript
  type NotificationType = 
    | 'trip_update' 
    | 'booking_confirmation' 
    | 'payment_received' 
    | 'system_alert';
  ```

#### Endpoint Structure
```typescript
// Notification Retrieval
router.get('/', listNotificationsHandler);

// Notification Management
router.put('/:id/read', markAsReadHandler);
router.post('/mark-all-read', markAllAsReadHandler);

// Development Only
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', testNotificationHandler);
}
```

#### Request/Response Examples

1. **List Notifications**
   ```http
   GET /notifications
   Authorization: Bearer <token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "notifications": [
         {
           "id": "notif-123",
           "type": "trip_update",
           "title": "Trip Updated",
           "message": "Your trip to Paris has been updated",
           "read": false,
           "created_at": "2023-01-01T12:00:00.000Z"
         }
       ],
       "unread_count": 5
     }
   }
   ```

2. **Mark as Read**
   ```http
   PUT /notifications/notif-123/read
   Authorization: Bearer <token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "message": "Notification marked as read"
   }
   ```

#### Best Practices
1. **Performance**:
   - Pagination for notification lists
   - Efficient database queries
   - Caching of frequent requests

2. **User Experience**:
   - Batch operations for read/unread
   - Clear notification types
   - Actionable notifications

3. **Security**:
   - User-scoped access control
   - Rate limiting
   - Production-safe test endpoints

### Billing Endpoint (`/billing`)

#### Subscription Management
- **Plan Tiers**:
  - Free (default)
  - Team (paid)
  - Enterprise (paid)

- **Stripe Integration**:
  - Customer management
  - Subscription lifecycle
  - Webhook handling

#### Endpoint Structure
```typescript
// Billing Information
router.get('/', getBillingInfoHandler);

// Subscription Management
router.post('/subscription', updateSubscriptionHandler);
router.get('/subscription/portal', createPortalSessionHandler);

// Payment Methods
router.get('/payment-methods', listPaymentMethodsHandler);
router.post('/payment-methods', addPaymentMethodHandler);
router.delete('/payment-methods/:id', removePaymentMethodHandler);

// Invoices
router.get('/invoices', listInvoicesHandler);
router.get('/invoices/:id', getInvoiceHandler);
```

#### Request/Response Examples

1. **Get Billing Information**
   ```http
   GET /billing
   Authorization: Bearer <token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "status": "active",
     "plan": "team",
     "customerId": "cus_abc123",
     "subscriptionId": "sub_xyz789",
     "currentPeriodEnd": "2023-12-31T23:59:59.000Z",
     "paymentMethod": {
       "brand": "visa",
       "last4": "4242",
       "expiry": "12/25"
     }
   }
   ```

2. **Update Subscription**
   ```http
   POST /billing/subscription
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "plan": "enterprise",
     "paymentMethodId": "pm_123456"
   }
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "message": "Subscription updated successfully",
     "subscriptionId": "sub_xyz789"
   }
   ```

#### Best Practices
1. **Security**:
   - PCI compliance
   - Tokenized payment processing
   - Webhook signature verification

2. **Error Handling**:
   - Clear error messages
   - Idempotent operations
   - Webhook retry logic

3. **User Experience**:
   - Clear plan comparison
   - Proration handling
   - Graceful downgrades

### Webhooks Endpoint (`/webhooks`)

#### Security & Verification
- **Signature Verification**:
  ```typescript
  const verifyStripeWebhook = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.header('stripe-signature');
    if (!signature) {
      res.status(400).json({ error: 'Missing Stripe signature' });
      return;
    }
    // ... verification logic ...
  };
  ```
- **Raw Body Handling**:
  - Preserves raw request body for signature verification
  - Prevents JSON parsing issues

#### Event Handling
- **Stripe Webhook Events**:
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `account.updated`
  - `payout.paid`
  - `payout.failed`

- **Event Processing**:
  ```typescript
  router.post('/stripe-invoice', async (req, res) => {
    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        // ... other event types
      }
    } catch (err) {
      // Error handling
    }
  });
  ```

#### Endpoint Structure
```typescript
// Stripe Webhooks
router.post('/stripe-invoice', stripeInvoiceWebhookHandler);
router.post('/stripe-connect', stripeConnectWebhookHandler);

// Third-party Integrations
router.post('/sendgrid', sendgridWebhookHandler);
router.post('/twilio', twilioWebhookHandler);
```

#### Request/Response Examples

1. **Stripe Webhook**
   ```http
   POST /webhooks/stripe-invoice
   Stripe-Signature: t=1234567890,v1=abc123...
   Content-Type: application/json
   
   {
     "id": "evt_123456789",
     "type": "invoice.payment_succeeded",
     "data": {
       "object": {
         "id": "in_123456789",
         "customer": "cus_123456789",
         "amount_paid": 999,
         "status": "paid"
       }
     }
   }
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "processed": true,
     "eventId": "evt_123456789"
   }
   ```

#### Best Practices
1. **Security**:
   - Verify webhook signatures
   - Validate event data
   - Implement idempotency keys

2. **Reliability**:
   - Retry failed events
   - Log all webhook events
   - Handle duplicate events

3. **Monitoring**:
   - Track webhook delivery status
   - Alert on failures
   - Monitor processing time

### Health Endpoint (`/health`)

#### Health Status Monitoring
- **Status Levels**:
  ```typescript
  type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
  ```
- **Metrics Tracked**:
  - Endpoint response times
  - Error rates
  - Request counts
  - Uptime

#### Endpoint Structure
```typescript
// Health Check
router.get('/', getHealthHandler);

// Detailed Health (admin only)
router.get('/detailed', getDetailedHealthHandler);

// Component Health
router.get('/database', getDatabaseHealthHandler);
router.get('/cache', getCacheHealthHandler);
router.get('/external-services', getExternalServicesHealthHandler);
```

#### Request/Response Examples

1. **Basic Health Check**
   ```http
   GET /health
   ```

   **Success Response (200 OK)**
   ```json
   {
     "status": "healthy",
     "uptime": 12345.67,
     "timestamp": "2023-01-01T12:00:00.000Z",
     "endpoints": {
       "total": 42,
       "healthy": 40,
       "degraded": 2,
       "unhealthy": 0
     },
     "performance": {
       "avgResponseTime": 125.5,
       "errorRate": 0.5
     }
   }
   ```

2. **Detailed Health Check**
   ```http
   GET /health?detailed=true
   ```

   **Success Response (200 OK)**
   ```json
   {
     "status": "healthy",
     "uptime": 12345.67,
     "timestamp": "2023-01-01T12:00:00.000Z",
     "endpoints": {
       "total": 42,
       "healthy": 40,
       "degraded": 2,
       "unhealthy": 0
     },
     "performance": {
       "avgResponseTime": 125.5,
       "errorRate": 0.5
     },
     "details": [
       {
         "endpoint": "/api/trips",
         "status": "healthy",
         "avgResponseTime": 120,
         "errorRate": 0.1,
         "requestCount": 1000,
         "lastChecked": "2023-01-01T12:00:00.000Z"
       },
       {
         "endpoint": "/api/bookings",
         "status": "degraded",
         "avgResponseTime": 250,
         "errorRate": 2.5,
         "requestCount": 500,
         "lastError": "Database connection timeout",
         "lastChecked": "2023-01-01T12:00:00.000Z"
       }
     ]
   }
   ```

#### Best Practices
1. **Performance**:
   - Lightweight checks
   - Cached responses
   - Minimal dependencies

2. **Security**:
   - Rate limiting
   - Sensitive data filtering
   - Authentication for detailed endpoints

3. **Monitoring**:
   - Regular health checks
   - Alerting on status changes
   - Historical data tracking

### Users Endpoint (`/superadmin/users`)

#### Access Control
- **Role-Based Access**:
  - Superadmin access required
  - Organization scoping
  - Permission checks

#### Endpoint Structure
```typescript
// List all users (superadmin only)
router.get('/', listUsersHandler);

// Get user details
router.get('/:id', getUserHandler);

// Update user
router.put('/:id', updateUserHandler);

// Delete user
router.delete('/:id', deleteUserHandler);
```

#### Request/Response Examples

1. **List Users**
   ```http
   GET /superadmin/users
   Authorization: Bearer <superadmin_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": [
       {
         "id": "user_123",
         "email": "user@example.com",
         "name": "John Doe",
         "role": "admin",
         "organization_id": "org_123",
         "created_at": "2023-01-01T12:00:00.000Z",
         "updated_at": "2023-01-01T12:00:00.000Z"
       }
     ],
     "pagination": {
       "total": 1,
       "page": 1,
       "limit": 10,
       "total_pages": 1
     }
   }
   ```

2. **Get User Details**
   ```http
   GET /superadmin/users/user_123
   Authorization: Bearer <superadmin_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "id": "user_123",
       "email": "user@example.com",
       "name": "John Doe",
       "role": "admin",
       "organization_id": "org_123",
       "created_at": "2023-01-01T12:00:00.000Z",
       "updated_at": "2023-01-01T12:00:00.000Z"
     }
   }
   ```

3. **Update User**
   ```http
   PUT /superadmin/users/user_123
   Authorization: Bearer <superadmin_token>
   Content-Type: application/json
   
   {
     "name": "John Updated",
     "role": "user"
   }
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "id": "user_123",
       "email": "user@example.com",
       "name": "John Updated",
       "role": "user",
       "organization_id": "org_123",
       "created_at": "2023-01-01T12:00:00.000Z",
       "updated_at": "2023-01-01T13:00:00.000Z"
     }
   }
   ```

#### Best Practices
1. **Security**:
   - Superadmin authentication required
   - Input validation
   - Rate limiting

2. **Data Management**:
   - Soft deletes
   - Audit logging
   - Data validation

3. **Performance**:
   - Pagination
   - Field selection
   - Caching

### Admin Settings Endpoint (`/admin/settings`)

#### Configuration Management
- **Settings Categories**:
  ```typescript
  interface SystemSettings {
    general: {
      platformName: string;
      maintenanceMode: boolean;
      registrationEnabled: boolean;
      emailVerificationRequired: boolean;
      maxUsersPerOrganization: number;
      sessionTimeoutMinutes: number;
    };
    security: {
      enforcePasswordComplexity: boolean;
      requireTwoFactor: boolean;
      passwordExpiryDays: number;
      maxLoginAttempts: number;
      lockoutDurationMinutes: number;
    };
    email: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      fromEmail: string;
      fromName: string;
    };
    features: {
      enableAIFeatures: boolean;
      enableFlightBooking: boolean;
      enableCorporateCards: boolean;
      enableAnalytics: boolean;
      enableWhiteLabel: boolean;
    };
  }
  ```

#### Endpoint Structure
```typescript
// Get all settings
router.get('/', getSettingsHandler);

// Update settings
router.put('/', updateSettingsHandler);

// Reset to defaults
router.post('/reset', resetSettingsHandler);

// Get audit logs
router.get('/audit-logs', getAuditLogsHandler);
```

#### Request/Response Examples

1. **Get Settings**
   ```http
   GET /admin/settings
   Authorization: Bearer <admin_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "general": {
         "platformName": "NestMap",
         "maintenanceMode": false,
         "registrationEnabled": true,
         "emailVerificationRequired": true,
         "maxUsersPerOrganization": 100,
         "sessionTimeoutMinutes": 480
       },
       "security": {
         "enforcePasswordComplexity": true,
         "requireTwoFactor": false,
         "passwordExpiryDays": 90,
         "maxLoginAttempts": 5,
         "lockoutDurationMinutes": 15
       },
       "email": {
         "smtpHost": "smtp.example.com",
         "smtpPort": 587,
         "smtpSecure": true,
         "fromEmail": "noreply@example.com",
         "fromName": "NestMap"
       },
       "features": {
         "enableAIFeatures": true,
         "enableFlightBooking": true,
         "enableCorporateCards": true,
         "enableAnalytics": true,
         "enableWhiteLabel": false
       }
     }
   }
   ```

2. **Update Settings**
   ```http
   PUT /admin/settings
   Authorization: Bearer <admin_token>
   Content-Type: application/json
   
   {
     "general": {
       "maintenanceMode": true,
       "registrationEnabled": false
     },
     "features": {
       "enableWhiteLabel": true
     }
   }
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "message": "Settings updated successfully",
     "auditLogId": "audit_123"
   }
   ```

#### Best Practices
1. **Security**:
   - Admin role required
   - Sensitive field encryption
   - Audit logging

2. **Validation**:
   - Input validation
   - Type checking
   - Value constraints

3. **Performance**:
   - Caching
   - Partial updates
   - Batch operations

### Analytics Endpoint (`/analytics`)

#### Data Access & Scoping
- **Access Levels**:
  ```typescript
  // Personal analytics (user's own data)
  router.get("/personal", personalAnalyticsHandler);
  
  // Organization analytics (admin access required)
  router.get("/organization/:orgId", orgAnalyticsHandler);
  
  // Global analytics (superadmin only)
  router.get("/global", globalAnalyticsHandler);
  ```

#### Data Export
- **Formats**:
  - CSV export
  - JSON response
  - Filtered datasets

#### Endpoint Structure
```typescript
// Core Analytics
router.get("/", getAnalyticsHandler);
router.get("/personal", getPersonalAnalyticsHandler);
router.get("/organization/:orgId", getOrgAnalyticsHandler);
router.get("/global", getGlobalAnalyticsHandler);

// Data Export
router.get("/export/csv", exportAnalyticsCSVHandler);
router.get("/export/json", exportAnalyticsJSONHandler);

// Real-time Analytics
router.get("/realtime", getRealtimeAnalyticsHandler);
```

#### Request/Response Examples

1. **Get Personal Analytics**
   ```http
   GET /analytics/personal
   Authorization: Bearer <user_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "overview": {
         "totalTrips": 15,
         "totalSpent": 4250.75,
         "favoriteDestination": "New York",
         "averageTripCost": 283.38,
         "tripDistribution": {
           "business": 10,
           "leisure": 5
         },
         "monthlyTrends": [
           { "month": "Jan", "trips": 2, "spend": 650.50 },
           { "month": "Feb", "trips": 3, "spend": 925.25 }
         ]
       },
       "lastUpdated": "2023-06-01T10:30:00.000Z"
     }
   }
   ```

2. **Export Analytics (CSV)**
   ```http
   GET /analytics/export/csv
   Authorization: Bearer <admin_token>
   ```

   **Success Response (200 OK)**
   ```
   Content-Type: text/csv
   Content-Disposition: attachment; filename="analytics-export-20230601.csv"
   
   Metric,Value
   Total Trips,15
   Total Spent,4250.75
   Average Trip Cost,283.38
   Business Trips,10
   Leisure Trips,5
   ```

#### Best Practices
1. **Performance**:
   - Data aggregation
   - Caching layer
   - Query optimization

2. **Security**:
   - Role-based access control
   - Data scoping
   - Rate limiting

3. **Usability**:
   - Consistent date formats
   - Timezone handling
   - Pagination for large datasets

### Activities Endpoint (`/activities`)

#### Activity Tracking
- **Core Types**:
  ```typescript
  type ActivityType = 'trip' | 'booking' | 'payment' | 'system';
  
  type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  interface Activity {
    id: string;
    type: ActivityType;
    status: ActivityStatus;
    userId: string;
    organizationId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }
  ```

#### Endpoint Structure
```typescript
// Activity Management
router.get('/', listActivitiesHandler);
router.get('/:activityId', getActivityHandler);
router.post('/', createActivityHandler);
router.put('/:activityId', updateActivityHandler);
router.delete('/:activityId', deleteActivityHandler);

// Activity Queries
router.get('/user/:userId', getUserActivitiesHandler);
router.get('/trip/:tripId', getTripActivitiesHandler);
router.get('/type/:activityType', getActivitiesByTypeHandler);
```

#### Request/Response Examples

1. **Create Activity**
   ```http
   POST /activities
   Authorization: Bearer <user_token>
   Content-Type: application/json
   
   {
     "type": "trip",
     "status": "in_progress",
     "metadata": {
       "tripId": "trip_123",
       "action": "created",
       "details": "New trip to New York"
     }
   }
   ```

   **Success Response (201 Created)**
   ```json
   {
     "success": true,
     "data": {
       "id": "act_123",
       "type": "trip",
       "status": "in_progress",
       "userId": "user_123",
       "organizationId": "org_123",
       "metadata": {
         "tripId": "trip_123",
         "action": "created",
         "details": "New trip to New York"
       },
       "createdAt": "2023-06-01T10:30:00.000Z",
       "updatedAt": "2023-06-01T10:30:00.000Z"
     }
   }
   ```

2. **List User Activities**
   ```http
   GET /activities/user/user_123?limit=10&offset=0
   Authorization: Bearer <user_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": [
       {
         "id": "act_123",
         "type": "trip",
         "status": "completed",
         "metadata": {
           "tripId": "trip_123",
           "action": "updated",
           "details": "Changed trip dates"
         },
         "createdAt": "2023-06-01T09:15:00.000Z"
       },
       {
         "id": "act_122",
         "type": "booking",
         "status": "completed",
         "metadata": {
           "bookingId": "book_456",
           "action": "created",
           "details": "Booked flight to New York"
         },
         "createdAt": "2023-06-01T08:30:00.000Z"
       }
     ],
     "pagination": {
       "total": 2,
       "limit": 10,
       "offset": 0
     }
   }
   ```

#### Best Practices
1. **Security**:
   - User authentication required
   - Organization scoping
   - Activity ownership validation

2. **Validation**:
   - Activity type validation
   - Status transitions
   - Metadata schema validation

3. **Performance**:
   - Pagination
   - Indexed queries
   - Caching for frequent lookups

4. **Audit Trail**:
   - Immutable records
   - Comprehensive metadata
   - User attribution

### Security Endpoint (`/security`)

#### Security Monitoring
- **Alert Types**:
  ```typescript
  type SecurityAlertType = 
    | 'suspicious_login' 
    | 'privilege_escalation' 
    | 'unusual_activity' 
    | 'failed_authentication' 
    | 'data_access';
  
  type SecurityAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
  
  interface SecurityAlert {
    id: string;
    type: SecurityAlertType;
    severity: SecurityAlertSeverity;
    title: string;
    description: string;
    timestamp: Date;
    userId?: string;
    organizationId?: string;
    metadata: Record<string, any>;
    resolved: boolean;
  }
  ```

#### Endpoint Structure
```typescript
// Security Alerts
router.get('/alerts', getSecurityAlertsHandler);
router.get('/alerts/:alertId', getSecurityAlertHandler);
router.patch('/alerts/:alertId/resolve', resolveSecurityAlertHandler);

// Security Metrics
router.get('/metrics', getSecurityMetricsHandler);
router.get('/metrics/history', getSecurityMetricsHistoryHandler);

// Audit Logs
router.get('/audit-logs', getAuditLogsHandler);
router.get('/audit-summary', getAuditSummaryHandler);
```

#### Request/Response Examples

1. **Get Security Alerts**
   ```http
   GET /security/alerts
   Authorization: Bearer <admin_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": [
       {
         "id": "alert_123",
         "type": "privilege_escalation",
         "severity": "high",
         "title": "Multiple Privilege Changes Detected",
         "description": "5 privilege changes in the last 24 hours. Review for unauthorized escalations.",
         "timestamp": "2023-06-01T10:30:00.000Z",
         "userId": "user_123",
         "organizationId": "org_123",
         "metadata": {
           "count": 5,
           "actions": ["role_updated", "user_role_changed"]
         },
         "resolved": false
       },
       {
         "id": "alert_122",
         "type": "failed_authentication",
         "severity": "medium",
         "title": "Multiple Failed Login Attempts",
         "description": "10 failed login attempts detected for user@example.com",
         "timestamp": "2023-06-01T09:15:00.000Z",
         "organizationId": "org_123",
         "metadata": {
           "email": "user@example.com",
           "attempts": 10,
           "ipAddress": "192.168.1.100"
         },
         "resolved": false
       }
     ],
     "pagination": {
       "total": 2,
       "limit": 10,
       "offset": 0
     }
   }
   ```

2. **Get Security Metrics**
   ```http
   GET /security/metrics
   Authorization: Bearer <admin_token>
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "score": 87,
       "metrics": {
         "activeSessions": 42,
         "failedLogins": 5,
         "securityAlerts": 2,
         "lastAudit": "2023-06-01T10:30:00.000Z",
         "usersWithMfa": 35,
         "adminUsers": 3,
         "apiCalls": {
           "total": 1245,
           "errorRate": 1.2
         }
       },
       "trends": {
         "scoreChange": 2,
         "alertsTrend": -15,
         "loginSuccessRate": 98.5
       }
     }
   }
   ```

#### Best Practices
1. **Alerting**:
   - Real-time notifications
   - Configurable thresholds
   - Actionable insights

2. **Monitoring**:
   - Continuous scanning
   - Anomaly detection
   - Baseline establishment

3. **Response**:
   - Incident triage
   - Automated remediation
   - Audit trail

4. **Compliance**:
   - Data retention policies
   - Audit logging
   - Access controls

### Common Patterns Across Endpoints

1. **Authentication**:
   - JWT-based authentication
   - Role-based access control
   - Organization-level isolation

2. **Validation**:
   - Request parameter validation
   - Input sanitization
   - Type coercion

3. **Response Format**:
   - Consistent success/error structure
   - Proper HTTP status codes
   - Pagination support

4. **Error Handling**:
   - Centralized error handling
   - Detailed error messages
   - Proper error logging

## Findings

### Authentication Endpoints

| Endpoint | Method | Request Type | Response Type | Status |
|----------|--------|--------------|---------------|--------|
| /auth/login | POST | LoginDto | AuthResponse | ✅ |
| /auth/register | POST | RegisterDto | AuthResponse | ✅ |
| /auth/refresh | POST | RefreshTokenDto | AuthTokens | ❌ |
| /auth/logout | POST | - | void | ❌ |

### File Upload/Download (`/expenses/:expenseId/receipt`)

#### File Handling
- **Validation Middleware**:
  ```typescript
  // Example usage in route
  router.post(
    '/:expenseId/receipt',
    validateFileUpload(
      ['image/jpeg', 'image/png', 'application/pdf'], 
      5 * 1024 * 1024 // 5MB max size
    ),
    uploadHandler
  );
  ```

#### Endpoint Structure
```typescript
// Receipt Upload
router.post('/expenses/:expenseId/receipt', uploadReceiptHandler);
router.get('/expenses/:expenseId/receipt', getReceiptHandler);
router.delete('/expenses/:expenseId/receipt', deleteReceiptHandler);

// File Validation Middleware
router.use('/upload', validateFileUpload(allowedTypes, maxSize));
```

#### Request/Response Examples

1. **Upload Receipt**
   ```http
   POST /expenses/123/receipt
   Authorization: Bearer <user_token>
   Content-Type: multipart/form-data
   
   [File: receipt.jpg]
   ```

   **Success Response (200 OK)**
   ```json
   {
     "success": true,
     "data": {
       "id": "file_123",
       "expenseId": 123,
       "url": "https://storage.example.com/receipts/expense_123.jpg",
       "fileName": "receipt.jpg",
       "fileType": "image/jpeg",
       "fileSize": 123456,
       "uploadedAt": "2023-06-01T10:30:00.000Z"
     }
   }
   ```

2. **Get Receipt**
   ```http
   GET /expenses/123/receipt
   Authorization: Bearer <user_token>
   ```

   **Success Response (200 OK)**
   ```
   [Binary file content]
   ```

#### Best Practices
1. **Security**:
   - File type whitelisting
   - Size limitations (5MB default)
   - Filename sanitization
   - Secure storage with access controls

2. **Validation**:
   - MIME type verification
   - File size limits
   - Content inspection
   - Virus scanning

3. **Performance**:
   - Streaming for large files
   - CDN integration
   - Caching headers
   - Optimized image handling

4. **Error Handling**:
   ```typescript
   // Example error response
   {
     "error": "File too large",
     "maxSize": 5242880,
     "fileName": "large-file.pdf"
   }
   ```

### Issues Found

1. **Type Duplication**
   - `AuthResponse` defined in multiple places
   - Inconsistent field naming (camelCase vs snake_case)
   - Missing type documentation

2. **Validation Gaps**
   - Inconsistent validation between client and server
   - No request/response schema validation
   - Missing input sanitization

3. **Documentation**
   - No OpenAPI/Swagger documentation
   - Inline JSDoc comments missing or outdated
   - No API versioning strategy

## Recommendations

### 1. Type Standardization
- [ ] Move all DTOs to shared types
- [ ] Use consistent naming conventions
- [ ] Add JSDoc comments for all types

### 2. Validation Layer
- [ ] Implement request validation middleware
- [ ] Add response validation
- [ ] Standardize error responses

### 3. Documentation
- [ ] Generate OpenAPI/Swagger docs
- [ ] Document all endpoints
- [ ] Add examples for requests/responses

## Implementation Plan

### Phase 1: Audit (1-2 days)
- [ ] Document all API endpoints
- [ ] Identify type inconsistencies
- [ ] Document current validation

### Phase 2: Standardization (3-5 days)
- [ ] Create shared DTOs
- [ ] Implement validation middleware
- [ ] Standardize error responses

### Phase 3: Documentation (1-2 days)
- [ ] Generate OpenAPI docs
- [ ] Add JSDoc comments
- [ ] Document API versioning

## Next Steps
1. Review and finalize this audit
2. Get approval for the implementation plan
3. Begin with Phase 1 implementation
