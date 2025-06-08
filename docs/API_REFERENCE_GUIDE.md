# NestMap API Reference Guide

**Version**: 2.0  
**Base URL**: `https://your-domain.com/api`  
**Documentation Last Updated**: June 8, 2025

## Table of Contents
- [Authentication](#authentication)
- [Users](#users)
- [Organizations](#organizations)
- [Trips](#trips)
- [Activities](#activities)
- [Bookings](#bookings)
- [Expenses](#expenses)
- [Flights](#flights)
- [Calendar](#calendar)
- [Analytics](#analytics)
- [Admin](#admin)
- [System](#system)

## Authentication

### POST `/api/auth/login`
Authenticate a user and retrieve an access token.

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "organization_id": 1,
    "role": "user"
  }
}
```

### POST `/api/auth/register`
Register a new user account.

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe",
  "organizationName": "Acme Corp"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "organization_id": 1,
    "role": "admin"
  },
  "token": "jwt_token_here"
}
```

### POST `/api/auth/refresh-token`
Refresh an expired access token.

**Request:**
```http
POST /api/auth/refresh-token
Authorization: Bearer <refresh_token>
```

**Response (200 OK):**
```json
{
  "token": "new_jwt_token_here",
  "expiresIn": 3600
}
```

### POST `/api/auth/logout`
Invalidate the current user's session.

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## Users

### GET `/api/users/me`
Get current user's profile information.

**Request:**
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "organization_id": 1,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### PUT `/api/users/me`
Update current user's profile.

**Request:**
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "timezone": "America/New_York"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "timezone": "America/New_York",
    "updatedAt": "2023-01-02T12:00:00.000Z"
  }
}
```

## Organizations

### GET `/api/organizations`
List all organizations (admin only).

### GET `/api/organizations/:id`
Get organization details.

### POST `/api/organizations`
Create a new organization.

### PUT `/api/organizations/:id`
Update organization details.

## Trips

### GET `/api/trips`
List all trips for the current user.

### POST `/api/trips`
Create a new trip.

### GET `/api/trips/:id`
Get trip details.

### PUT `/api/trips/:id`
Update a trip.

### DELETE `/api/trips/:id`
Delete a trip.

## Activities

### GET `/api/activities`
List activities for a trip.

### POST `/api/activities`
Create a new activity.

## Bookings

### GET `/api/bookings`
List all bookings.

### POST `/api/bookings`
Create a new booking.

## Expenses

### GET `/api/expenses`
List all expenses.

### POST `/api/expenses`
Create a new expense.

## Flights

### GET `/api/flights/search`
Search for flights.

### POST `/api/flights/book`
Book a flight.

## Calendar

### GET `/api/calendar/events`
Get calendar events.

## Analytics

### GET `/api/analytics/overview`
Get analytics overview.

## Admin

### GET `/api/admin/users`
List all users (admin only).

### POST `/api/admin/users`
Create a new user (admin only).

## System

### GET `/api/health`
Check system health.

**Request:**
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "cache": "connected",
    "storage": "connected"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "req_12345"
}
```

## Rate Limiting
- All API endpoints are rate limited to 100 requests per minute per IP address.
- Authentication endpoints have stricter rate limits (10 requests per minute).
- Exceeding rate limits will result in a 429 Too Many Requests response.

## Authentication
- Include the JWT token in the `Authorization` header for authenticated requests:
  ```
  Authorization: Bearer <your_jwt_token>
  ```
- Tokens expire after 24 hours by default.
- Use the refresh token endpoint to obtain a new access token.

## Webhooks

### POST `/api/webhooks/stripe`
Handle Stripe webhook events.

**Request:**
```http
POST /api/webhooks/stripe
Stripe-Signature: <signature>
Content-Type: application/json

{
  "id": "evt_123456789",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123456789",
      "amount": 1000,
      "currency": "usd"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "received": true
}
```

## Changelog

### v2.0 (2025-06-08)
- Complete API reference documentation
- Added detailed request/response examples
- Included error handling documentation
- Added rate limiting information
- Improved authentication documentation

### v1.0 (2023-01-01)
- Initial API release

## User Management

### GET `/api/users/auth/{userId}`
Get user by ID with authentication context.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "organization_id": 1,
  "role": "user"
}
```

### GET `/api/user/permissions`
Get current user's permissions and role information.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "role": "admin",
  "permissions": ["read", "write", "admin"],
  "organization_id": 1
}
```

## Trip Management

### GET `/api/trips`
Get all trips for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": 1,
    "title": "Business Trip to NYC",
    "destination": "New York City",
    "start_date": "2025-07-01",
    "end_date": "2025-07-05",
    "status": "planned",
    "user_id": 1,
    "organization_id": 1
  }
]
```

### POST `/api/trips`
Create new trip.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "title": "Business Trip to NYC",
  "destination": "New York City",
  "start_date": "2025-07-01",
  "end_date": "2025-07-05",
  "description": "Important client meeting"
}
```

### GET `/api/trips/{tripId}`
Get specific trip by ID.

### PUT `/api/trips/{tripId}`
Update existing trip.

### DELETE `/api/trips/{tripId}`
Delete trip.

## Activity Management

### GET `/api/trips/{tripId}/activities`
Get all activities for a specific trip.

### POST `/api/trips/{tripId}/activities`
Add activity to trip.

**Request Body:**
```json
{
  "title": "Client Meeting",
  "time": "09:00",
  "location_name": "Corporate Office",
  "notes": "Quarterly review meeting",
  "tag": "Meeting",
  "day": 1
}
```

### PUT `/api/activities/{activityId}`
Update activity.

### DELETE `/api/activities/{activityId}`
Delete activity.

## Flight Search & Booking

### POST `/api/flights/search`
Search for flights using Duffel API.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "origin": "JFK",
  "destination": "LAX",
  "departure_date": "2025-07-01",
  "return_date": "2025-07-05",
  "passengers": [
    {
      "type": "adult"
    }
  ]
}
```

**Response:**
```json
{
  "offers": [
    {
      "id": "off_12345",
      "total_amount": "450.00",
      "total_currency": "USD",
      "slices": [
        {
          "segments": [
            {
              "departing_at": "2025-07-01T08:00:00Z",
              "arriving_at": "2025-07-01T11:30:00Z",
              "origin": {"iata_code": "JFK"},
              "destination": {"iata_code": "LAX"}
            }
          ]
        }
      ]
    }
  ]
}
```

### POST `/api/flights/book`
Book selected flight offer.

**Request Body:**
```json
{
  "offer_id": "off_12345",
  "passengers": [
    {
      "title": "mr",
      "given_name": "John",
      "family_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    }
  ]
}
```

## Organization Management

### GET `/api/organizations/{orgId}`
Get organization details.

### PUT `/api/organizations/{orgId}`
Update organization settings.

### GET `/api/organizations/{orgId}/members`
Get organization members.

### POST `/api/organizations/{orgId}/invite`
Invite user to organization.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "user"
}
```

## White Label Branding

### GET `/api/white-label/config`
Get white label branding configuration.

**Response:**
```json
{
  "isWhiteLabelActive": true,
  "config": {
    "companyName": "Acme Travel",
    "primaryColor": "#6D5DFB",
    "secondaryColor": "#6D5DFB",
    "accentColor": "#6D5DFB",
    "logoUrl": null
  }
}
```

### POST `/api/white-label/configure`
Configure white label branding.

**Request Body:**
```json
{
  "companyName": "Acme Travel",
  "primaryColor": "#6D5DFB",
  "tagline": "Your Travel Partner",
  "logoUrl": "https://example.com/logo.png"
}
```

### GET `/api/white-label/permissions`
Check white label permissions for organization.

## Analytics

### GET `/api/analytics/agency`
Get analytics data for current user/organization.

**Response:**
```json
{
  "overview": {
    "totalTrips": 25,
    "totalUsers": 5,
    "totalActivities": 150,
    "averageTripLength": 3.5
  },
  "destinations": [
    {
      "city": "New York City",
      "country": "USA",
      "tripCount": 8,
      "percentage": 32
    }
  ]
}
```

### GET `/api/analytics/organization/{orgId}`
Get organization-wide analytics (admin only).

## Templates

### GET `/api/templates`
Get available trip templates.

**Response:**
```json
[
  {
    "id": "nyc-weekend",
    "title": "NYC Weekend Getaway",
    "description": "Experience the best of New York City in 3 days",
    "duration": 3,
    "city": "New York City",
    "country": "USA",
    "tags": ["City Break", "Culture", "Food"],
    "activities": [
      {
        "title": "Central Park Walk",
        "time": "09:00",
        "locationName": "Central Park",
        "tag": "Sightseeing",
        "day": 1
      }
    ]
  }
]
```

## Notifications

### GET `/api/notifications`
Get user notifications.

### POST `/api/notifications/mark-read`
Mark notifications as read.

## Payment Processing

### POST `/api/create-payment-intent`
Create Stripe payment intent for one-time payment.

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "usd"
}
```

### POST `/api/get-or-create-subscription`
Get or create Stripe subscription for organization.

## Health & Monitoring

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-07T12:00:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "code": 400
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 attempts per 15 minutes per IP
- Higher limits available for paid plans

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response Headers:**
- `X-Total-Count` - Total number of items
- `X-Page-Count` - Total number of pages

## Authentication Headers

For protected endpoints, include JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Domain-Based White Labeling

For white label domains, the API automatically detects the domain and applies appropriate organization context. No additional headers required.

## Webhook Endpoints

### POST `/api/webhooks/stripe`
Stripe webhook handler for payment events.

### POST `/api/acme-challenge/{token}`
ACME challenge handler for SSL certificate validation.

---

**Note**: This API uses JWT-only authentication. Session-based authentication is not supported. All timestamps are in ISO 8601 format (UTC).