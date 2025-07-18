# NestMap Enterprise API Guide
## Complete API Reference for Enterprise Features

This guide provides comprehensive API documentation for all enterprise features implemented in NestMap.

---

## 🔐 Authentication

All enterprise API endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Required Headers
```bash
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

---

## 🛡️ Policy Compliance API

### Check Trip Compliance
```http
POST /api/compliance/check-trip
```

**Request Body:**
```json
{
  "tripData": {
    "destination": "London",
    "budget": 5000,
    "duration": 7,
    "class": "business",
    "departureDate": "2024-03-15",
    "returnDate": "2024-03-22"
  }
}
```

**Response:**
```json
{
  "passed": false,
  "violations": [
    {
      "id": "v123",
      "ruleId": "r456",
      "severity": "warning",
      "message": "Budget exceeds department limit of $4000",
      "field": "budget"
    }
  ],
  "requiresApproval": true,
  "approvalRequired": ["budget_manager", "travel_admin"],
  "approvalRequestId": "ar789"
}
```

### Get Policy Rules
```http
GET /api/policies/rules?type=budget&enabled=true
```

**Response:**
```json
[
  {
    "id": "r456",
    "name": "Department Budget Limit",
    "description": "Enforce department-specific budget limits",
    "type": "budget",
    "severity": "warning",
    "enabled": true,
    "conditions": [
      {
        "field": "budget",
        "operator": "greater_than",
        "value": 4000
      }
    ],
    "actions": [
      {
        "type": "require_approval",
        "approverRoles": ["budget_manager"]
      }
    ]
  }
]
```

### Create Policy Rule
```http
POST /api/policies/rules
```

**Request Body:**
```json
{
  "name": "International Travel Policy",
  "description": "Requires approval for international travel",
  "type": "travel",
  "severity": "error",
  "enabled": true,
  "conditions": [
    {
      "field": "destination_country",
      "operator": "not_equals",
      "value": "US"
    }
  ],
  "actions": [
    {
      "type": "require_approval",
      "approverRoles": ["travel_admin", "manager"]
    }
  ]
}
```

---

## ✅ Approval Workflow API

### Get Approval Requests
```http
GET /api/approvals/requests?status=pending&priority=high
```

**Response:**
```json
[
  {
    "id": "ar789",
    "title": "International Business Trip - London",
    "description": "Q1 Sales Conference attendance",
    "entityType": "trip",
    "entityId": 123,
    "status": "pending",
    "priority": "high",
    "requiredApprovers": [
      {
        "level": 1,
        "name": "Manager Approval",
        "approverRoles": ["manager"],
        "requiresAll": false
      }
    ],
    "currentLevel": 1,
    "approvals": [],
    "requestedAt": "2024-01-18T10:00:00Z",
    "dueDate": "2024-01-20T17:00:00Z",
    "requesterName": "John Doe",
    "policyViolations": ["Budget exceeds limit"]
  }
]
```

### Process Approval
```http
POST /api/approvals/requests/ar789/process
```

**Request Body:**
```json
{
  "action": "approved",
  "comments": "Approved for Q1 sales conference. Budget justified by expected ROI."
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "ar789",
  "status": "approved",
  "nextLevel": null,
  "completed": true,
  "requesterId": 456
}
```

### Add Comment
```http
POST /api/approvals/requests/ar789/comments
```

**Request Body:**
```json
{
  "comment": "Please provide additional justification for the business class upgrade."
}
```

---

## 🔒 Multi-Factor Authentication API

### Setup TOTP
```http
POST /api/mfa/setup/totp
```

**Request Body:**
```json
{
  "appName": "NestMap"
}
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/NestMap:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=NestMap",
  "backupCodes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

### Verify TOTP Setup
```http
POST /api/mfa/setup/totp/verify
```

**Request Body:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "methodId": "mfa123",
  "enabled": true
}
```

### Create MFA Challenge
```http
POST /api/mfa/challenge
```

**Request Body:**
```json
{
  "userId": 123,
  "methodId": "mfa123"
}
```

**Response:**
```json
{
  "id": "challenge456",
  "type": "totp",
  "expiresAt": "2024-01-18T10:05:00Z"
}
```

---

## 💰 Expense Integration API

### Get Integration Providers
```http
GET /api/expenses/integrations/providers
```

**Response:**
```json
[
  {
    "provider": "concur",
    "name": "SAP Concur",
    "enabled": true,
    "lastSync": "2024-01-18T09:00:00Z",
    "status": "connected"
  },
  {
    "provider": "expensify",
    "name": "Expensify",
    "enabled": true,
    "lastSync": "2024-01-18T08:30:00Z",
    "status": "connected"
  }
]
```

### Sync Expenses
```http
POST /api/expenses/integrations/sync
```

**Request Body:**
```json
{
  "provider": "concur",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "syncedCount": 45,
  "errors": [],
  "summary": {
    "totalAmount": 12500.00,
    "currency": "USD",
    "categories": {
      "flights": 8500.00,
      "hotels": 3200.00,
      "meals": 800.00
    }
  }
}
```

### Export Expenses
```http
POST /api/expenses/integrations/export
```

**Request Body:**
```json
{
  "provider": "concur",
  "expenseIds": [123, 456, 789],
  "reportName": "Q1 2024 Travel Expenses"
}
```

**Response:**
```json
{
  "exportId": "exp123",
  "status": "processing",
  "reportName": "Q1 2024 Travel Expenses",
  "expenseCount": 3,
  "estimatedCompletion": "2024-01-18T10:15:00Z"
}
```

---

## 🌍 Localization API

### Get Supported Languages
```http
GET /api/localization/languages
```

**Response:**
```json
[
  {
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "region": "US"
  },
  {
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español",
    "region": "ES"
  }
]
```

### Get Translations
```http
GET /api/localization/translations/es?namespace=trips
```

**Response:**
```json
{
  "trips.title": "Viajes",
  "trips.create": "Crear Viaje",
  "trips.destination": "Destino",
  "trips.budget": "Presupuesto"
}
```

### Convert Currency
```http
POST /api/localization/currency/convert
```

**Request Body:**
```json
{
  "amount": 1000,
  "fromCurrency": "USD",
  "toCurrency": "EUR"
}
```

**Response:**
```json
{
  "originalAmount": 1000,
  "convertedAmount": 850.50,
  "fromCurrency": "USD",
  "toCurrency": "EUR",
  "exchangeRate": 0.8505,
  "timestamp": "2024-01-18T10:00:00Z"
}
```

---

## 💬 Communication Integration API

### Send Notification
```http
POST /api/communication/notifications
```

**Request Body:**
```json
{
  "title": "Trip Approved",
  "message": "Your business trip to London has been approved",
  "type": "approval_decision",
  "priority": "normal",
  "recipients": [123, 456],
  "data": {
    "tripId": 789,
    "approver": "Jane Smith"
  }
}
```

**Response:**
```json
[
  {
    "provider": "slack",
    "success": true,
    "messageId": "slack123"
  },
  {
    "provider": "teams",
    "success": true,
    "messageId": "teams456"
  }
]
```

### Get Slack Channels
```http
GET /api/communication/slack/channels
```

**Response:**
```json
[
  {
    "id": "C1234567890",
    "name": "travel-notifications",
    "isPrivate": false,
    "memberCount": 25
  },
  {
    "id": "C0987654321",
    "name": "expense-alerts",
    "isPrivate": false,
    "memberCount": 12
  }
]
```

---

## 📊 Compliance & Reporting API

### Get Compliance Metrics
```http
GET /api/compliance/metrics
```

**Response:**
```json
{
  "totalPolicies": 15,
  "activePolicies": 12,
  "violationsLast30Days": 8,
  "complianceRate": 94,
  "topViolations": [
    {
      "rule": "Budget Limit Exceeded",
      "count": 5
    },
    {
      "rule": "Missing Receipt",
      "count": 3
    }
  ]
}
```

### Generate Compliance Report
```http
GET /api/compliance/report?framework=gdpr&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "framework": "gdpr",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "dataSubjects": 1456,
    "rightsRequests": 12,
    "processingActivities": 8,
    "complianceScore": 98
  },
  "details": {
    "rightsRequests": [
      {
        "type": "access",
        "count": 8,
        "avgProcessingTime": "2.5 days"
      },
      {
        "type": "deletion",
        "count": 3,
        "avgProcessingTime": "1.8 days"
      }
    ]
  }
}
```

---

## 📅 Enhanced Calendar API

### Sync Calendar
```http
POST /api/calendar/sync
```

**Request Body:**
```json
{
  "providerId": "google_cal_123"
}
```

**Response:**
```json
{
  "success": true,
  "syncedEvents": 25,
  "conflicts": 2,
  "lastSync": "2024-01-18T10:00:00Z"
}
```

### Get Calendar Providers
```http
GET /api/calendar/providers
```

**Response:**
```json
[
  {
    "id": "google_cal_123",
    "provider": "google",
    "name": "john.doe@company.com",
    "enabled": true,
    "lastSync": "2024-01-18T09:30:00Z"
  },
  {
    "id": "outlook_cal_456",
    "provider": "outlook",
    "name": "john.doe@company.com",
    "enabled": true,
    "lastSync": "2024-01-18T09:25:00Z"
  }
]
```

---

## 🔍 Error Handling

All API endpoints return consistent error responses:

### Error Response Format
```json
{
  "error": "Validation failed",
  "message": "Budget amount must be greater than 0",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "budget",
    "value": -100,
    "constraint": "positive_number"
  },
  "timestamp": "2024-01-18T10:00:00Z",
  "requestId": "req_123456"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | External service unavailable | 503 |

---

## 🚀 Rate Limiting

API endpoints are rate limited to ensure fair usage:

### Rate Limits by Endpoint Category

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Policy Compliance | 100 requests | 1 minute |
| Approval Workflows | 50 requests | 1 minute |
| MFA Operations | 20 requests | 1 minute |
| Expense Integration | 200 requests | 1 minute |
| Localization | 500 requests | 1 minute |
| Communication | 100 requests | 1 minute |
| Compliance Reporting | 20 requests | 1 minute |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642518000
```

---

## 📝 Request/Response Examples

### Complete Policy Compliance Flow

1. **Check compliance:**
```bash
curl -X POST "https://api.nestmap.com/api/compliance/check-trip" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "tripData": {
      "destination": "London",
      "budget": 5000,
      "duration": 7
    }
  }'
```

2. **Create approval request (if needed):**
```bash
curl -X POST "https://api.nestmap.com/api/approvals/requests" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "trip",
    "entityId": 123,
    "requestData": {
      "destination": "London",
      "budget": 5000
    },
    "businessJustification": "Q1 sales conference attendance"
  }'
```

3. **Process approval:**
```bash
curl -X POST "https://api.nestmap.com/api/approvals/requests/ar789/process" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approved",
    "comments": "Approved for business purposes"
  }'
```

---

## 🔧 SDK Examples

### JavaScript/TypeScript SDK Usage

```typescript
import { NestMapClient } from '@nestmap/sdk';

const client = new NestMapClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.nestmap.com'
});

// Check trip compliance
const compliance = await client.compliance.checkTrip({
  destination: 'London',
  budget: 5000,
  duration: 7
});

// Setup MFA
const mfaSetup = await client.mfa.setupTOTP({
  appName: 'NestMap'
});

// Sync expenses
const syncResult = await client.expenses.sync({
  provider: 'concur',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Python SDK Usage

```python
from nestmap import NestMapClient

client = NestMapClient(
    api_key='your-api-key',
    base_url='https://api.nestmap.com'
)

# Check trip compliance
compliance = client.compliance.check_trip({
    'destination': 'London',
    'budget': 5000,
    'duration': 7
})

# Process approval
approval = client.approvals.process_request(
    request_id='ar789',
    action='approved',
    comments='Approved for business purposes'
)
```

---

## 🔐 Security Best Practices

### API Key Management
- Store API keys securely using environment variables
- Rotate keys regularly (recommended: every 90 days)
- Use different keys for different environments
- Never commit keys to version control

### Request Security
- Always use HTTPS in production
- Validate all input data
- Implement proper error handling
- Log security events for monitoring

### Rate Limiting
- Implement exponential backoff for retries
- Cache responses when appropriate
- Use webhooks for real-time updates instead of polling

---

## 📞 Support & Resources

### Getting Help
- **Documentation**: [https://docs.nestmap.com](https://docs.nestmap.com)
- **API Status**: [https://status.nestmap.com](https://status.nestmap.com)
- **Support**: [support@nestmap.com](mailto:support@nestmap.com)
- **Community**: [https://community.nestmap.com](https://community.nestmap.com)

### Useful Links
- **Postman Collection**: [Download](https://api.nestmap.com/postman)
- **OpenAPI Spec**: [Download](https://api.nestmap.com/openapi.json)
- **Changelog**: [View](https://docs.nestmap.com/changelog)
- **Migration Guides**: [View](https://docs.nestmap.com/migrations)

---

**API Version**: v1.0  
**Last Updated**: January 18, 2025  
**Next Review**: April 18, 2025

*This API guide covers all enterprise features implemented in NestMap. For basic API endpoints, refer to the main README.md file.*
