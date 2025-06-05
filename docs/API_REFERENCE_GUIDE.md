# NestMap API Reference Guide
## Complete API Documentation and Business Intelligence

---

## API Overview

NestMap provides a comprehensive RESTful API designed for enterprise integration and third-party development. All endpoints follow REST conventions with JSON request/response formats and standardized HTTP status codes.

### Base URL
```
Production: https://api.nestmap.com/v1
Staging: https://staging-api.nestmap.com/v1
Development: http://localhost:5000/api
```

### Authentication
All API requests require authentication via JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Rate Limiting
- **Standard Users**: 1000 requests per hour
- **Premium Users**: 5000 requests per hour
- **Enterprise**: Custom limits based on agreement

### Response Format
All responses follow a consistent structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-12-01T10:00:00Z",
    "request_id": "req_1234567890",
    "rate_limit": {
      "remaining": 999,
      "reset": 1701428400
    }
  }
}
```

---

## Authentication Endpoints

### POST /auth/login
Authenticate user and obtain access token.

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600,
    "user": {
      "id": 123,
      "email": "user@company.com",
      "organization_id": 456,
      "role": "user",
      "permissions": ["trips:read", "trips:write"]
    }
  }
}
```

### POST /auth/refresh
Refresh expired access token using refresh token.

### POST /auth/logout
Invalidate current session and tokens.

### POST /auth/forgot-password
Initiate password reset process.

---

## User Management Endpoints

### GET /users/profile
Retrieve current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "organization": {
      "id": 456,
      "name": "Acme Corporation",
      "domain": "acme.com"
    },
    "preferences": {
      "currency": "USD",
      "timezone": "America/New_York",
      "notification_settings": {
        "email": true,
        "push": true,
        "sms": false
      }
    },
    "created_at": "2024-01-15T09:30:00Z",
    "last_login": "2024-12-01T08:15:00Z"
  }
}
```

### PUT /users/profile
Update user profile information.

### GET /users/permissions
Retrieve user's current permissions.

### POST /users/change-password
Change user password.

---

## Trip Management Endpoints

### GET /trips
Retrieve user's trips with filtering and pagination.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (planning, booked, completed, cancelled)
- `start_date` (date): Filter trips starting after this date
- `end_date` (date): Filter trips ending before this date
- `destination` (string): Filter by destination city or country
- `sort` (string): Sort field (created_at, start_date, title)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": 789,
        "title": "Q4 Sales Conference",
        "start_date": "2024-12-15",
        "end_date": "2024-12-17",
        "destination": {
          "city": "San Francisco",
          "country": "United States",
          "coordinates": {
            "latitude": 37.7749,
            "longitude": -122.4194
          }
        },
        "status": "planning",
        "budget": {
          "allocated": 5000.00,
          "spent": 1200.00,
          "currency": "USD"
        },
        "travelers": [
          {
            "id": 123,
            "name": "John Doe",
            "role": "primary"
          }
        ],
        "bookings_count": 2,
        "created_at": "2024-11-01T10:00:00Z",
        "updated_at": "2024-11-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### POST /trips
Create a new trip.

**Request Body:**
```json
{
  "title": "European Sales Summit",
  "start_date": "2024-12-20",
  "end_date": "2024-12-22",
  "destination": {
    "city": "London",
    "country": "United Kingdom"
  },
  "budget": 7500.00,
  "currency": "USD",
  "trip_type": "business",
  "description": "Annual European sales team meeting",
  "travelers": [
    {
      "user_id": 123,
      "role": "primary"
    },
    {
      "user_id": 124,
      "role": "participant"
    }
  ],
  "preferences": {
    "accommodation_level": "business",
    "flight_class": "economy",
    "dietary_restrictions": ["vegetarian"]
  }
}
```

### GET /trips/{trip_id}
Retrieve specific trip details.

### PUT /trips/{trip_id}
Update trip information.

### DELETE /trips/{trip_id}
Delete trip (only if no confirmed bookings exist).

### POST /trips/{trip_id}/clone
Create a copy of existing trip.

### GET /trips/{trip_id}/itinerary
Generate detailed trip itinerary.

---

## Booking Management Endpoints

### POST /bookings/flights/search
Search for available flights.

**Request Body:**
```json
{
  "origin": "JFK",
  "destination": "LHR",
  "departure_date": "2024-12-20",
  "return_date": "2024-12-22",
  "passengers": [
    {
      "type": "adult",
      "count": 2
    }
  ],
  "cabin_class": "economy",
  "preferences": {
    "direct_flights_only": false,
    "max_stops": 1,
    "preferred_airlines": ["AA", "BA"],
    "flexible_dates": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "flights": [
      {
        "id": "flight_search_123",
        "outbound": {
          "segments": [
            {
              "flight_number": "AA101",
              "airline": "American Airlines",
              "departure": {
                "airport": "JFK",
                "city": "New York",
                "time": "2024-12-20T08:00:00Z",
                "terminal": "8"
              },
              "arrival": {
                "airport": "LHR",
                "city": "London",
                "time": "2024-12-20T19:30:00Z",
                "terminal": "3"
              },
              "duration": "7h 30m",
              "aircraft": "Boeing 777-300ER"
            }
          ],
          "total_duration": "7h 30m",
          "stops": 0
        },
        "return": {
          "segments": [
            {
              "flight_number": "AA102",
              "airline": "American Airlines",
              "departure": {
                "airport": "LHR",
                "city": "London", 
                "time": "2024-12-22T10:15:00Z",
                "terminal": "3"
              },
              "arrival": {
                "airport": "JFK",
                "city": "New York",
                "time": "2024-12-22T13:45:00Z",
                "terminal": "8"
              },
              "duration": "8h 30m",
              "aircraft": "Boeing 777-300ER"
            }
          ],
          "total_duration": "8h 30m",
          "stops": 0
        },
        "pricing": {
          "total": 1250.00,
          "base_fare": 1050.00,
          "taxes": 200.00,
          "currency": "USD",
          "fare_type": "Economy Basic"
        },
        "amenities": ["wifi", "power", "entertainment"],
        "baggage": {
          "carry_on": "1 x 10kg",
          "checked": "1 x 23kg included"
        }
      }
    ],
    "search_metadata": {
      "total_results": 45,
      "search_time": "2.3s",
      "price_range": {
        "min": 890.00,
        "max": 2150.00
      }
    }
  }
}
```

### POST /bookings/flights/book
Book selected flight.

### POST /bookings/hotels/search
Search for hotel accommodations.

### POST /bookings/hotels/book
Book selected hotel.

### GET /bookings
Retrieve user's bookings.

### GET /bookings/{booking_id}
Get specific booking details.

### PUT /bookings/{booking_id}/cancel
Cancel booking.

---

## Corporate Card Endpoints

### GET /corporate-cards/cards
Retrieve organization's corporate cards.

**Response:**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "card_123",
        "stripe_card_id": "ic_1234567890",
        "cardholder_name": "John Doe",
        "card_number_masked": "**** **** **** 1234",
        "card_type": "virtual",
        "status": "active",
        "spending_limits": {
          "per_transaction": 5000.00,
          "daily": 10000.00,
          "monthly": 50000.00
        },
        "available_balance": 45000.00,
        "currency": "USD",
        "restrictions": {
          "allowed_categories": ["lodging", "airlines", "restaurants"],
          "blocked_categories": ["gambling", "adult_entertainment"],
          "geographic_restrictions": ["US", "CA", "GB"]
        },
        "created_at": "2024-01-15T09:00:00Z",
        "expires_at": "2027-01-31T23:59:59Z"
      }
    ]
  }
}
```

### POST /corporate-cards/create
Issue new virtual corporate card.

### GET /corporate-cards/transactions
Retrieve card transaction history.

**Query Parameters:**
- `card_id` (string): Filter by specific card
- `start_date` (date): Transactions after this date
- `end_date` (date): Transactions before this date
- `category` (string): Filter by merchant category
- `amount_min` (number): Minimum transaction amount
- `amount_max` (number): Maximum transaction amount

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_987654321",
        "card_id": "card_123",
        "amount": 125.50,
        "currency": "USD",
        "merchant": {
          "name": "Hilton Garden Inn",
          "category": "lodging",
          "city": "San Francisco",
          "country": "US"
        },
        "description": "Hotel accommodation",
        "status": "approved",
        "created_at": "2024-11-28T15:30:00Z",
        "metadata": {
          "trip_id": 789,
          "expense_category": "accommodation",
          "receipt_url": "https://receipts.nestmap.com/receipt_abc123.pdf"
        }
      }
    ],
    "summary": {
      "total_amount": 2750.25,
      "transaction_count": 15,
      "categories": {
        "lodging": 1200.00,
        "airlines": 850.00,
        "restaurants": 700.25
      }
    }
  }
}
```

### PUT /corporate-cards/{card_id}/limits
Update card spending limits.

### POST /corporate-cards/{card_id}/freeze
Temporarily freeze card.

### POST /corporate-cards/{card_id}/unfreeze
Unfreeze previously frozen card.

---

## Analytics & Reporting Endpoints

### GET /analytics/overview
Get comprehensive analytics overview.

**Query Parameters:**
- `period` (string): Time period (week, month, quarter, year)
- `start_date` (date): Custom start date
- `end_date` (date): Custom end date
- `organization_id` (integer): Organization filter (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_trips": 156,
      "total_spending": 245750.00,
      "average_trip_cost": 1575.32,
      "active_travelers": 45,
      "pending_approvals": 8
    },
    "trends": {
      "trips_growth": 15.3,
      "spending_growth": -5.2,
      "traveler_growth": 8.7
    },
    "top_destinations": [
      {
        "city": "New York",
        "country": "United States",
        "trip_count": 23,
        "total_spend": 45600.00
      },
      {
        "city": "London",
        "country": "United Kingdom", 
        "trip_count": 18,
        "total_spend": 39200.00
      }
    ],
    "spending_breakdown": {
      "flights": 98500.00,
      "hotels": 87250.00,
      "meals": 35600.00,
      "transportation": 24400.00
    },
    "compliance_metrics": {
      "policy_compliance_rate": 94.5,
      "approval_time_avg": "2.3 hours",
      "expense_accuracy": 97.8
    }
  }
}
```

### GET /analytics/trips
Detailed trip analytics.

### GET /analytics/spending
Spending analysis and forecasting.

### GET /analytics/compliance
Compliance and policy adherence metrics.

### POST /analytics/reports/generate
Generate custom analytics report.

**Request Body:**
```json
{
  "report_type": "monthly_summary",
  "filters": {
    "departments": ["sales", "marketing"],
    "trip_types": ["business"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "format": "pdf",
  "delivery": {
    "method": "email",
    "recipients": ["manager@company.com"]
  },
  "schedule": {
    "frequency": "monthly",
    "day_of_month": 1
  }
}
```

---

## Organization Management Endpoints

### GET /organizations/settings
Retrieve organization configuration.

### PUT /organizations/settings
Update organization settings.

### GET /organizations/users
List organization members.

### POST /organizations/users/invite
Invite new users to organization.

### GET /organizations/departments
Retrieve department structure.

### POST /organizations/policies
Create or update travel policies.

---

## Approval Workflow Endpoints

### GET /approvals/pending
Get pending approval requests.

**Response:**
```json
{
  "success": true,
  "data": {
    "approvals": [
      {
        "id": "approval_456",
        "type": "trip_booking",
        "status": "pending",
        "priority": "normal",
        "requested_by": {
          "id": 123,
          "name": "John Doe",
          "department": "Sales"
        },
        "request_details": {
          "trip_id": 789,
          "trip_title": "Client Meeting - Tokyo",
          "total_amount": 3500.00,
          "currency": "USD",
          "justification": "Important client presentation for Q4 deal closure"
        },
        "approval_chain": [
          {
            "approver_id": 456,
            "approver_name": "Jane Smith",
            "role": "Manager",
            "status": "approved",
            "approved_at": "2024-11-28T10:15:00Z"
          },
          {
            "approver_id": 789,
            "approver_name": "Mike Johnson",
            "role": "Director", 
            "status": "pending",
            "due_date": "2024-11-30T17:00:00Z"
          }
        ],
        "created_at": "2024-11-28T09:00:00Z",
        "expires_at": "2024-12-05T17:00:00Z"
      }
    ],
    "summary": {
      "total_pending": 8,
      "overdue": 2,
      "urgent": 1
    }
  }
}
```

### POST /approvals/{approval_id}/approve
Approve pending request.

### POST /approvals/{approval_id}/reject
Reject pending request.

### POST /approvals/{approval_id}/delegate
Delegate approval to another user.

---

## Notification Endpoints

### GET /notifications
Retrieve user notifications.

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "booking_confirmation",
        "title": "Flight Booking Confirmed",
        "message": "Your flight AA101 from JFK to LHR has been confirmed.",
        "priority": "normal",
        "read": false,
        "actions": [
          {
            "label": "View Booking",
            "url": "/bookings/booking_789"
          }
        ],
        "metadata": {
          "booking_id": "booking_789",
          "trip_id": 456
        },
        "created_at": "2024-11-28T14:30:00Z"
      }
    ],
    "unread_count": 5
  }
}
```

### PUT /notifications/{notification_id}/read
Mark notification as read.

### POST /notifications/mark-all-read
Mark all notifications as read.

---

## Integration Endpoints

### GET /integrations/available
List available third-party integrations.

### POST /integrations/connect
Connect to third-party service.

### GET /integrations/status
Check integration connection status.

### POST /integrations/sync
Trigger data synchronization.

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid",
    "details": [
      {
        "field": "start_date",
        "message": "Start date must be in the future"
      }
    ],
    "request_id": "req_1234567890"
  }
}
```

### HTTP Status Codes
- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Codes
- `AUTHENTICATION_REQUIRED`: Missing or invalid authentication
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `BOOKING_UNAVAILABLE`: Requested booking is no longer available
- `INSUFFICIENT_BALANCE`: Corporate card balance insufficient
- `POLICY_VIOLATION`: Request violates organization policy

---

## Business Intelligence Features

### Advanced Analytics Capabilities

#### Predictive Analytics
- **Spend Forecasting**: ML-powered budget predictions
- **Travel Pattern Analysis**: Seasonal and departmental trends
- **Cost Optimization**: Automated savings recommendations
- **Risk Assessment**: Travel risk and compliance scoring

#### Custom Dashboards
- **Executive Dashboards**: C-level travel insights
- **Department Views**: Team-specific analytics
- **Individual Reports**: Personal travel summaries
- **Compliance Monitoring**: Policy adherence tracking

#### Data Export & Integration
- **API Data Export**: Programmatic data access
- **Business Intelligence Tools**: Tableau, Power BI integration
- **Custom Reports**: Automated report generation
- **Real-time Streaming**: Live data feeds for external systems

### KPI Metrics Available

#### Financial Metrics
- Total travel spend by period
- Average cost per trip
- Budget variance analysis
- Cost per employee
- Savings achieved through policy compliance
- ROI on travel investments

#### Operational Metrics
- Booking lead times
- Approval workflow efficiency
- Trip completion rates
- Vendor performance scores
- User adoption rates
- Mobile app usage statistics

#### Compliance Metrics
- Policy adherence percentage
- Expense accuracy rates
- Approval time averages
- Exception request frequency
- Audit trail completeness
- Risk assessment scores

---

## Webhook Events

NestMap supports webhooks for real-time event notifications to external systems.

### Available Events
- `trip.created`
- `trip.updated` 
- `trip.deleted`
- `booking.confirmed`
- `booking.cancelled`
- `payment.processed`
- `approval.required`
- `approval.completed`
- `expense.submitted`
- `policy.violated`

### Webhook Payload Example
```json
{
  "event": "booking.confirmed",
  "timestamp": "2024-11-28T15:30:00Z",
  "data": {
    "booking_id": "booking_789",
    "trip_id": 456,
    "user_id": 123,
    "organization_id": 789,
    "booking_type": "flight",
    "total_amount": 1250.00,
    "currency": "USD"
  },
  "metadata": {
    "webhook_id": "webhook_123",
    "delivery_attempt": 1,
    "signature": "sha256=abc123..."
  }
}
```

---

## SDK and Code Examples

### JavaScript/Node.js SDK
```javascript
const NestMapAPI = require('@nestmap/sdk');

const client = new NestMapAPI({
  apiKey: 'your_api_key',
  environment: 'production' // or 'staging'
});

// Create a new trip
const trip = await client.trips.create({
  title: 'Business Conference',
  startDate: '2024-12-01',
  endDate: '2024-12-03',
  destination: {
    city: 'San Francisco',
    country: 'United States'
  }
});

// Search for flights
const flights = await client.bookings.searchFlights({
  origin: 'JFK',
  destination: 'SFO',
  departureDate: '2024-12-01',
  passengers: 1
});

// Get analytics data
const analytics = await client.analytics.getOverview({
  period: 'month'
});
```

### Python SDK
```python
from nestmap import NestMapClient

client = NestMapClient(
    api_key='your_api_key',
    environment='production'
)

# Create trip
trip = client.trips.create({
    'title': 'Business Conference',
    'start_date': '2024-12-01',
    'end_date': '2024-12-03',
    'destination': {
        'city': 'San Francisco',
        'country': 'United States'
    }
})

# Get corporate cards
cards = client.corporate_cards.list()

# Generate report
report = client.analytics.generate_report({
    'report_type': 'monthly_summary',
    'format': 'pdf'
})
```

---

This comprehensive API reference provides complete documentation for integrating with NestMap's enterprise travel management platform, enabling seamless third-party development and business intelligence integration.