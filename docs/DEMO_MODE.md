# Remvana Demo Mode Guide

## Overview

Remvana includes a fully-featured demo mode that allows potential customers to explore the platform without signing up. Demo mode provides isolated sandbox environments with realistic data and automatic resets to ensure a consistent experience.

## Quick Start

### Accessing Demo Mode

1. **Visit the demo site**: Navigate to your Remvana instance with demo mode enabled
2. **Use demo credentials**: Click "Try Demo" or login with any of the demo accounts listed below
3. **Explore freely**: All changes are isolated and automatically reset every 30 minutes

### Demo Accounts

| Email | Password | Role | Organization | Description |
|-------|----------|------|--------------|-------------|
| sarah.chen@techcorp.demo | demo123 | Admin | TechCorp International | Full administrative access, can manage trips, users, and settings |
| mike.rodriguez@techcorp.demo | demo123 | Manager | TechCorp International | Can create and manage team trips, approve expenses |
| emma.thompson@techcorp.demo | demo123 | User | TechCorp International | Standard user, can create personal trips and submit expenses |
| alex@creativestudio.demo | demo123 | Admin | Creative Design Studio | Admin for smaller organization |
| jessica@creativestudio.demo | demo123 | User | Creative Design Studio | Standard user in design studio |

## Features Available in Demo Mode

### ✅ Full Access To:
- **Trip Planning**: Create, edit, and manage business trips
- **Activity Scheduling**: Add flights, hotels, meetings, and activities
- **Expense Tracking**: Submit and review travel expenses
- **Team Collaboration**: Share trips and collaborate with team members
- **Analytics Dashboard**: View travel spend analytics and reports
- **AI Assistant**: Get trip recommendations and automated planning
- **Flight Search**: Search real flight data via Duffel API
- **Calendar Integration**: Export trips to calendar
- **Mobile Experience**: Full mobile-responsive interface

### 🚫 Restricted Operations:
- **No Real Bookings**: Cannot make actual flight or hotel bookings
- **No Email Sending**: Email notifications are simulated
- **No Payment Processing**: Stripe integration is disabled
- **No Data Export**: Cannot download reports or export data
- **No API Access**: External API calls are blocked
- **Limited File Uploads**: Cannot upload documents or receipts
- **No User Creation**: Cannot create new user accounts
- **No Organization Changes**: Cannot modify organization settings

## Demo Mode Behavior

### Automatic Resets
- Demo data automatically resets every 30 minutes (at :00 and :30)
- All user-created trips, activities, and expenses are removed
- Core demo data (sample trips and users) are preserved
- Active sessions continue working but see refreshed data

### Session Limits
- Demo sessions last 30 minutes
- No login required for API testing with demo headers
- Rate limits: 100 requests per minute per demo user

### Data Isolation
- Each demo user sees only their organization's data
- Changes made by one demo user don't affect others
- No access to production data or real user information

## Setting Up Demo Mode

### For Administrators

1. **Enable Demo Mode**:
```bash
# In your .env file
ENABLE_DEMO_MODE=true
DEMO_RESET_INTERVAL=30  # minutes
```

2. **Seed Demo Data**:
```bash
npm run seed:demo
```

3. **Start Auto-Reset Scheduler** (optional):
```javascript
// In server startup
import { startDemoResetScheduler } from './services/demoResetService';
if (process.env.ENABLE_DEMO_MODE === 'true') {
  startDemoResetScheduler();
}
```

### API Testing with Demo Mode

For developers and integrators, you can test the API using demo headers:

```bash
# Get demo status
curl https://your-domain.com/api/demo/status

# Make API calls as demo user
curl -H "X-Demo-Mode: true" \
     -H "X-Demo-User-Id: demo-sarah-chen" \
     https://your-domain.com/api/trips

# Quick login for testing
curl -X POST https://your-domain.com/api/demo/quick-login \
     -H "Content-Type: application/json" \
     -d '{"role": "admin"}'
```

## Best Practices for Demo Users

1. **Start with the Dashboard**: Get an overview of the platform's capabilities
2. **Create a Sample Trip**: Try the trip creation wizard to see the workflow
3. **Explore Team Features**: Switch between users to see different permission levels
4. **Test Mobile Experience**: Resize your browser or use mobile device
5. **Try AI Features**: Use the AI assistant for trip planning suggestions

## Common Demo Scenarios

### Scenario 1: Executive Travel Planning
1. Login as `sarah.chen@techcorp.demo` (Admin)
2. Create a new leadership summit trip
3. Add flights and accommodation
4. Set approval requirements
5. View analytics dashboard

### Scenario 2: Team Conference Coordination
1. Login as `mike.rodriguez@techcorp.demo` (Manager)
2. Create a team conference trip
3. Invite team members
4. Manage shared activities
5. Review team expenses

### Scenario 3: Individual Business Travel
1. Login as `emma.thompson@techcorp.demo` (User)
2. Create a client meeting trip
3. Submit expense reports
4. Export trip itinerary

## Troubleshooting

### Issue: "Demo mode is not enabled"
**Solution**: Demo mode must be enabled by the administrator. Contact support if you're expecting demo access.

### Issue: "Changes disappeared"
**Solution**: This is normal - demo data resets every 30 minutes. Your changes were successfully saved but cleared during the reset.

### Issue: "Cannot perform this action in demo mode"
**Solution**: Some operations are restricted in demo mode for security. This includes real bookings, emails, and payment processing.

### Issue: "Demo user not found"
**Solution**: Use the exact email addresses listed above. Demo users have specific usernames and domains.

## Demo Mode for Sales Teams

### Effective Demo Flow
1. **Start with Why**: Explain the business problem Remvana solves
2. **Show Real Scenarios**: Use the pre-configured trips as examples
3. **Highlight Differentiators**: 
   - Multi-tenant architecture for enterprise scale
   - White-label capabilities
   - Real-time collaboration
   - Comprehensive analytics
4. **Let Them Explore**: Share demo credentials for hands-on experience

### Key Features to Demonstrate
- **For Executives**: Analytics dashboard, cost savings, compliance
- **For Travel Managers**: Approval workflows, team oversight, reporting
- **For End Users**: Easy trip planning, mobile access, expense management
- **For IT Teams**: API access, security features, integration options

## Security in Demo Mode

- Demo mode runs in complete isolation from production data
- No real API calls to external services (flights, hotels, payments)
- All demo users have restricted permissions
- Automatic cleanup prevents data accumulation
- No sensitive information is exposed

## Feedback and Support

If you encounter any issues or have suggestions for improving the demo experience:

1. **Technical Issues**: support@remvana.com
2. **Sales Questions**: sales@remvana.com
3. **Feature Requests**: Use the in-app feedback widget

---

**Note**: Demo mode is designed to showcase Remvana capabilities. For a full evaluation with your organization's specific needs, contact our sales team for a personalized demo and trial account.