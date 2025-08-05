# Remvana API Documentation

## Overview

The Remvana API is a RESTful API that provides access to all platform features. All API endpoints require authentication via JWT tokens unless otherwise specified.

## Base URL

```
Production: https://api.remvana.com
Development: http://localhost:5000/api
```

## Authentication

Remvana uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "role": "admin",
    "organizationId": 1
  }
}
```

## Core API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
```
Authenticate user and receive JWT token.

#### Register
```http
POST /api/auth/register
```
Create new user account.

#### Validate Token
```http
GET /api/auth/validate
```
Validate current JWT token.

#### Logout
```http
POST /api/auth/logout
```
Invalidate current session.

### Organizations

#### List Organizations
```http
GET /api/organizations
```
Returns organizations accessible to the current user.

#### Get Organization
```http
GET /api/organizations/:id
```
Get specific organization details.

#### Create Organization
```http
POST /api/organizations
```
Create new organization (requires appropriate permissions).

```json
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "settings": {
    "branding": {
      "primaryColor": "#0066cc"
    }
  }
}
```

#### Update Organization
```http
PUT /api/organizations/:id
```
Update organization details.

#### Organization Members
```http
GET /api/organizations/:id/members
```
List all members of an organization.

#### Invite Member
```http
POST /api/organizations/:id/invite
```
Send invitation to join organization.

### Trips

#### List Trips
```http
GET /api/trips
```
Get all trips for the current user.

Query parameters:
- `organizationId` - Filter by organization
- `status` - Filter by status (planning, active, completed)
- `startDate` - Filter trips starting after date
- `endDate` - Filter trips ending before date

#### Get Trip
```http
GET /api/trips/:id
```
Get specific trip details including activities.

#### Create Trip
```http
POST /api/trips
```
Create new trip.

```json
{
  "title": "Q1 Sales Conference",
  "description": "Annual sales team meeting",
  "startDate": "2024-03-15",
  "endDate": "2024-03-18",
  "destination": "San Francisco, CA",
  "organizationId": 1
}
```

#### Update Trip
```http
PUT /api/trips/:id
```
Update trip details.

#### Delete Trip
```http
DELETE /api/trips/:id
```
Delete trip (soft delete).

#### Export Trip
```http
GET /api/trips/:id/export
```
Export trip to PDF format.

### Activities

#### List Activities
```http
GET /api/activities/trip/:tripId
```
Get all activities for a specific trip.

#### Create Activity
```http
POST /api/activities
```
Add new activity to trip.

```json
{
  "tripId": 1,
  "title": "Client Meeting",
  "description": "Meeting with Acme Corp team",
  "startTime": "2024-03-15T10:00:00Z",
  "endTime": "2024-03-15T11:30:00Z",
  "location": "Acme HQ, 123 Main St",
  "type": "meeting"
}
```

#### Update Activity
```http
PUT /api/activities/:id
```
Update activity details.

#### Delete Activity
```http
DELETE /api/activities/:id
```
Remove activity from trip.

#### Reorder Activities
```http
PUT /api/activities/:id/order
```
Change activity order within a day.

### Flight Search & Booking

#### Search Flights
```http
POST /api/flights/search
```
Search for available flights using Duffel API.

```json
{
  "origin": "JFK",
  "destination": "SFO",
  "departureDate": "2024-03-15",
  "returnDate": "2024-03-18",
  "passengers": [
    {
      "type": "adult"
    }
  ],
  "cabinClass": "economy"
}
```

#### Get Flight Offer
```http
GET /api/flights/offers/:id
```
Get detailed flight offer information.

#### Book Flight
```http
POST /api/flights/book
```
Book flight with passenger details.

### AI Features

#### Summarize Day
```http
POST /api/ai/summarize-day
```
Generate AI summary of daily activities.

#### Suggest Activities
```http
POST /api/ai/suggest-activities
```
Get AI-powered activity recommendations.

#### Optimize Itinerary
```http
POST /api/ai/optimize-itinerary
```
Optimize trip itinerary for efficiency.

#### Translate Content
```http
POST /api/ai/translate-content
```
Translate text to specified language.

### Notifications

#### List Notifications
```http
GET /api/notifications
```
Get user's notifications.

#### Mark as Read
```http
PUT /api/notifications/:id/read
```
Mark notification as read.

#### Update Preferences
```http
PUT /api/notifications/preferences
```
Update notification preferences.

## Superadmin API Endpoints

All superadmin endpoints require `SUPERADMIN` role.

### Dashboard Overview
```http
GET /api/superadmin/overview
```
Get platform-wide statistics and metrics.

### Revenue & Billing

#### Revenue Overview
```http
GET /api/superadmin/revenue/overview
```
Get MRR, ARR, churn, and growth metrics.

#### Billing Events
```http
GET /api/superadmin/billing/events
```
List all billing events.

#### Organization Billing
```http
GET /api/superadmin/billing/:orgId
```
Get billing details for specific organization.

### System Monitoring

#### Health Overview
```http
GET /api/superadmin/monitoring/overview
```
Get system health metrics.

#### Performance Metrics
```http
GET /api/superadmin/monitoring/metrics
```
Get detailed performance data.

Query parameters:
- `type` - Metric type (system, api, database)
- `period` - Time period (1h, 24h, 7d, 30d)

### User Management

#### List All Users
```http
GET /api/superadmin/users
```
Get all platform users with filters.

#### User Analytics
```http
GET /api/superadmin/users/analytics
```
Get user behavior analytics.

#### Impersonate User
```http
POST /api/superadmin/users/:id/impersonate
```
Start impersonation session.

### Feature Flags

#### List Feature Flags
```http
GET /api/superadmin/flags
```
Get all feature flags.

#### Update Feature Flag
```http
PUT /api/superadmin/flags/:id
```
Update feature flag settings.

#### A/B Test Management
```http
POST /api/superadmin/flags/:id/experiment
```
Create A/B test for feature.

### Pricing Management

#### List Pricing Plans
```http
GET /api/superadmin/pricing/plans
```
Get all pricing plans.

#### Update Pricing Plan
```http
POST /api/superadmin/pricing/plans
```
Create or update pricing plan.

```json
{
  "name": "professional",
  "displayName": "Professional",
  "priceMonthly": 99,
  "priceYearly": 999,
  "features": ["unlimited_trips", "team_collaboration"],
  "syncToStripe": true
}
```

#### Sync to Stripe
```http
POST /api/superadmin/pricing/sync-to-stripe
```
Sync all pricing plans to Stripe.

### Communications

#### Create Announcement
```http
POST /api/superadmin/communications/announcements
```
Create platform announcement.

#### Send Broadcast
```http
POST /api/superadmin/communications/broadcasts
```
Send email broadcast to users.

#### Manage Changelog
```http
POST /api/superadmin/communications/changelog
```
Add changelog entry.

## Webhooks

Remvana can send webhooks for various events:

### Stripe Webhooks
```http
POST /api/webhooks/stripe
```
Handle Stripe webhook events.

### Organization Events
- `organization.created`
- `organization.updated`
- `organization.member.added`
- `organization.member.removed`

### Trip Events
- `trip.created`
- `trip.updated`
- `trip.completed`
- `trip.shared`

## Rate Limiting

API endpoints have the following rate limits:

- Authentication: 5 requests per minute
- General API: 100 requests per minute
- Search endpoints: 20 requests per minute
- AI endpoints: 10 requests per minute
- Superadmin: 1000 requests per minute

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Best Practices

1. **Authentication**: Store JWT tokens securely and refresh before expiration
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Filtering**: Use query parameters to filter results efficiently
4. **Error Handling**: Implement exponential backoff for retries
5. **Webhooks**: Verify webhook signatures for security
6. **Rate Limiting**: Implement client-side rate limiting

## SDK Examples

### JavaScript/TypeScript
```typescript
import { RemvanaClient } from '@remvana/sdk';

const client = new RemvanaClient({
  apiKey: process.env.VOYAGEOPS_API_KEY,
  baseUrl: 'https://api.remvana.com'
});

// List trips
const trips = await client.trips.list({
  organizationId: 1,
  status: 'active'
});

// Create activity
const activity = await client.activities.create({
  tripId: trips[0].id,
  title: 'Team Dinner',
  startTime: new Date('2024-03-15T19:00:00Z')
});
```

### Python
```python
from remvana import RemvanaClient

client = RemvanaClient(
    api_key=os.environ.get('VOYAGEOPS_API_KEY'),
    base_url='https://api.remvana.com'
)

# Search flights
results = client.flights.search(
    origin='JFK',
    destination='LAX',
    departure_date='2024-03-15',
    passengers=[{'type': 'adult'}]
)

# Book flight
booking = client.flights.book(
    offer_id=results.offers[0].id,
    passengers=[{
        'given_name': 'John',
        'family_name': 'Doe',
        'email': 'john@example.com'
    }]
)
```

## Support

For API support, contact:
- Email: api-support@remvana.com
- Documentation: https://docs.remvana.com
- Status Page: https://status.remvana.com