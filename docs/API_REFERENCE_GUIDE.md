# Remvana API Reference Guide

**Version**: 1.0  
**Base URL**: `https://your-domain.com/api`  
**Authentication**: JWT Bearer Token required for most endpoints

## Authentication

### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
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
Register new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe"
}
```

### POST `/api/auth/logout`
Logout current user session.

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