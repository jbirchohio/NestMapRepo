# Sentry Error Monitoring Setup

Remvana includes comprehensive error monitoring with Sentry for production-ready error tracking and performance monitoring.

## Features

✅ **Automatic Error Capture**: All unhandled exceptions and errors are automatically sent to Sentry  
✅ **Performance Monitoring**: Request tracing and performance metrics  
✅ **User Context**: Errors include user information for better debugging  
✅ **Security**: Sensitive data (passwords, tokens) is automatically filtered  
✅ **Integration**: Seamlessly integrated with the logging system  

## Setup Instructions

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Create a free account
3. Create a new Node.js project
4. Copy your DSN (Data Source Name)

### 2. Configure Environment

Add to your `.env` file:

```bash
# Sentry DSN for error monitoring
SENTRY_DSN=https://your-project-id@o123456.ingest.sentry.io/123456
```

### 3. Environment-Specific Configuration

The Sentry service automatically configures itself based on `NODE_ENV`:

**Development:**
- Debug mode enabled
- All events sampled (100%)
- Verbose logging

**Production:**
- Debug mode disabled
- Performance sampling (10%)
- Error sampling (100%)
- Optimized for performance

## Features in Detail

### Automatic Error Tracking

All errors are automatically captured including:
- Unhandled exceptions
- API endpoint errors
- Database errors
- Authentication failures
- Validation errors

### User Context

Errors include user information when available:
```javascript
{
  id: 123,
  email: "user@example.com", 
  username: "johndoe",
  organizationId: 456
}
```

### Request Context

Every error includes:
- HTTP method and endpoint
- Request parameters and body
- User agent and IP
- Response status code

### Performance Monitoring

- Request/response timing
- Database query performance
- API endpoint performance
- Memory usage tracking

### Security & Privacy

Sensitive data is automatically filtered:
- Authorization headers
- Password fields
- API keys and tokens
- Cookie data

## Usage Examples

### Manual Error Capture

```typescript
import { sentryService } from '@/services/sentryService';

// Capture exception
try {
  riskyOperation();
} catch (error) {
  sentryService.captureException(error, {
    tags: { component: 'payment' },
    extra: { orderId: 123 }
  });
}

// Capture message
sentryService.captureMessage('Payment processing failed', 'error', {
  userId: 123,
  paymentId: 'pay_xyz'
});

// Set user context
sentryService.setUser({
  id: user.id,
  email: user.email,
  organizationId: user.organizationId
});
```

### Performance Monitoring

```typescript
const transaction = sentryService.startTransaction(
  'process-payment',
  'payment'
);

// ... payment logic ...

transaction?.finish();
```

## Dashboard & Alerts

Once configured, you can:

1. **View Errors**: See all errors in real-time on your Sentry dashboard
2. **Set Alerts**: Get notified via email/Slack when errors occur
3. **Performance Insights**: Monitor API performance and bottlenecks
4. **Release Tracking**: Track errors across deployments
5. **User Impact**: See which users are affected by errors

## Integration Status

- ✅ **Server**: Fully integrated with Express.js
- ✅ **Logger**: Automatic error forwarding
- ✅ **Auth**: User context tracking
- ✅ **Database**: Query performance monitoring
- ✅ **API Routes**: Request/response tracking
- ⏳ **Frontend**: Client-side error tracking (future enhancement)

## Production Checklist

Before deploying to production:

- [ ] Sentry project created
- [ ] SENTRY_DSN configured in production environment
- [ ] Alerts configured for critical errors
- [ ] Team members added to Sentry project
- [ ] Release tracking configured (optional)
- [ ] Performance thresholds set (optional)

## Troubleshooting

**Sentry not capturing errors:**
- Check SENTRY_DSN is correctly set
- Verify environment variables are loaded
- Check network connectivity to sentry.io

**Too many events:**
- Adjust sample rates in sentryService.init()
- Filter out noisy errors in beforeSend hook

**Missing user context:**
- Ensure JWT auth middleware runs before error handlers
- Check user object structure matches expected format

## Cost Considerations

Sentry offers:
- **Free Tier**: 5,000 errors/month + 10,000 performance events
- **Paid Plans**: Start at $26/month for 50,000 errors
- **Enterprise**: Custom pricing for high-volume applications

For a $99k acquisition-ready platform, the free tier should be sufficient for initial monitoring, with easy upgrade path as the platform scales.