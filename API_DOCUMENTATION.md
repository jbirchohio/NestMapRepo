# NestMap API Documentation

## Overview

NestMap provides a comprehensive REST API for corporate travel management with JWT authentication, organization management, flight booking, and white-label branding capabilities.

**Base URL**: `http://localhost:3000/api` (development)

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Auth Endpoints

#### POST /api/auth/login
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
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "organizationId": "org-id",
    "role": "user"
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "organizationId": "org-id"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "organizationId": "org-id",
    "role": "user"
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

#### POST /api/auth/logout
Logout and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "organizationId": "org-id",
  "role": "user"
}
```

## Flight Endpoints

All flight endpoints require authentication.

#### POST /api/flights/search
Search for flights using Duffel API.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "origin": "JFK",
  "destination": "LAX",
  "departureDate": "2024-06-15",
  "returnDate": "2024-06-20",
  "passengers": {
    "adults": 1,
    "children": 0,
    "infants": 0
  },
  "cabinClass": "economy"
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "offer-id",
      "total_amount": "299.99",
      "total_currency": "USD",
      "slices": [
        {
          "origin": {
            "iata_code": "JFK",
            "name": "John F. Kennedy International Airport"
          },
          "destination": {
            "iata_code": "LAX",
            "name": "Los Angeles International Airport"
          },
          "departure_datetime": "2024-06-15T08:00:00Z",
          "arrival_datetime": "2024-06-15T11:30:00Z",
          "duration": "PT5H30M"
        }
      ]
    }
  ]
}
```

#### GET /api/flights/offers/:id
Get detailed flight offer information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "offer-id",
  "total_amount": "299.99",
  "total_currency": "USD",
  "expires_at": "2024-06-15T12:00:00Z",
  "slices": [...],
  "passengers": [...],
  "conditions": {...}
}
```

#### POST /api/flights/book
Book a flight offer.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "offerId": "offer-id",
  "passengers": [
    {
      "type": "adult",
      "title": "mr",
      "given_name": "John",
      "family_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    }
  ],
  "payments": [
    {
      "type": "balance",
      "amount": "299.99",
      "currency": "USD"
    }
  ]
}
```

**Response:**
```json
{
  "id": "booking-id",
  "reference": "ABC123",
  "status": "confirmed",
  "total_amount": "299.99",
  "total_currency": "USD"
}
```

#### GET /api/flights/airports/search
Search for airports.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q` (string): Search query
- `limit` (number): Maximum results (default: 10)

**Response:**
```json
{
  "data": [
    {
      "iata_code": "JFK",
      "name": "John F. Kennedy International Airport",
      "city": "New York",
      "country": "United States"
    }
  ]
}
```

## Organization Endpoints

#### GET /api/organizations
List organizations (admin sees all, users see their own).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "organizations": [
    {
      "id": "org-id",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "enterprise",
      "settings": {
        "timezone": "America/New_York",
        "locale": "en-US",
        "whiteLabel": {
          "enabled": true,
          "logoUrl": "https://example.com/logo.png",
          "primaryColor": "#007bff"
        }
      }
    }
  ]
}
```

#### POST /api/organizations
Create a new organization (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Company",
  "slug": "new-company",
  "plan": "business",
  "settings": {
    "timezone": "America/New_York",
    "locale": "en-US"
  }
}
```

#### PUT /api/organizations/:id
Update organization details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "settings": {
    "timezone": "America/Los_Angeles"
  }
}
```

#### GET /api/organizations/:id
Get organization details.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/organizations/:id/members
Get organization members.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "members": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## White Label Branding Endpoints

#### GET /api/branding/theme
Get organization's white label theme.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "enabled": true,
  "logoUrl": "https://example.com/logo.png",
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d",
  "accentColor": "#28a745",
  "backgroundColor": "#ffffff",
  "textColor": "#212529",
  "linkColor": "#007bff",
  "buttonStyle": "rounded",
  "fontFamily": "Inter",
  "customCSS": ".custom { color: red; }",
  "favicon": "https://example.com/favicon.ico",
  "companyName": "Acme Corp",
  "tagline": "Your travel partner",
  "contactEmail": "support@acme.com",
  "supportUrl": "https://acme.com/support",
  "privacyUrl": "https://acme.com/privacy",
  "termsUrl": "https://acme.com/terms",
  "socialLinks": {
    "twitter": "https://twitter.com/acme",
    "linkedin": "https://linkedin.com/company/acme"
  }
}
```

#### PUT /api/branding/theme
Update organization's white label theme.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "enabled": true,
  "primaryColor": "#ff6b35",
  "companyName": "Updated Company Name"
}
```

#### GET /api/branding/css
Get generated CSS for organization's theme.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --accent-color: #28a745;
  --background-color: #ffffff;
  --text-color: #212529;
  --link-color: #007bff;
}

.btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}
```

#### GET /api/branding/assets
Get branding assets and metadata.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/branding/preview
Preview theme changes without saving.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "primaryColor": "#ff6b35",
  "secondaryColor": "#333333"
}
```

#### DELETE /api/branding/cache
Clear branding cache (admin only).

**Headers:** `Authorization: Bearer <token>`

## Trip Endpoints

#### GET /api/trips
List trips for the organization.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "trips": [
    {
      "id": "trip-id",
      "name": "Business Trip to NYC",
      "description": "Quarterly business review",
      "startDate": "2024-06-15",
      "endDate": "2024-06-18",
      "destinationCity": "New York",
      "destinationCountry": "United States",
      "status": "planned",
      "budget": 2500.00,
      "createdBy": "user-id",
      "organizationId": "org-id"
    }
  ]
}
```

#### POST /api/trips
Create a new trip.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Business Trip to NYC",
  "description": "Quarterly business review",
  "startDate": "2024-06-15",
  "endDate": "2024-06-18",
  "destinationCity": "New York",
  "destinationCountry": "United States",
  "budget": 2500.00
}
```

#### PUT /api/trips/:id
Update trip details.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/trips/:id
Delete a trip.

**Headers:** `Authorization: Bearer <token>`

## Error Responses

All endpoints may return the following error responses:

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request data",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions to access this resource"
}
```

#### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

The API implements multiple layers of rate limiting:

- **Global Rate Limit**: 1000 requests per 15 minutes per IP
- **Auth Rate Limit**: 10 requests per 15 minutes per IP for auth endpoints
- **API Rate Limit**: 100 requests per 15 minutes per authenticated user

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

## Health Check

#### GET /health
Check server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```
