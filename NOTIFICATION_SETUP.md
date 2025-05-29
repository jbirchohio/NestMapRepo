# Notification System Setup Guide

This application includes a complete notification infrastructure supporting in-app, email, and push notifications. Follow this guide to activate all notification features.

## Current Status

✅ **In-App Notifications** - Fully working  
⚠️ **Email Notifications** - Requires SendGrid API key  
⚠️ **Push Notifications** - Requires VAPID keys  

## Required Environment Variables

Add these to your Replit Secrets or environment variables:

### Email Notifications (SendGrid)

```
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

**How to get SendGrid API key:**
1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create a new API key with "Full Access" permissions
4. Copy the key (starts with `SG.`)

### Push Notifications (VAPID Keys)

```
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your@email.com
```

**How to generate VAPID keys:**

Option 1 - Online Generator:
1. Visit https://web-push-codelab.glitch.me/
2. Click "Generate Keys"
3. Copy the Public and Private keys

Option 2 - Using npm:
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Optional Configuration

```
FRONTEND_URL=https://your-app-domain.replit.app
```

## Notification Features

### Email Notifications

Once configured, users will receive emails for:
- Trip sharing invitations
- Booking confirmations  
- Activity reminders
- Team invitations
- Payment due notices

Email templates are professionally designed with:
- Branded header with NestMap logo
- Color-coded notification types
- Action buttons for quick access
- Unsubscribe preferences link

### Push Notifications

Browser push notifications work even when the app is closed:
- Instant delivery to user's desktop/mobile
- Clickable notifications that open relevant pages
- Action buttons for quick responses
- Works across Chrome, Firefox, Safari, Edge

### In-App Notifications

Already working out of the box:
- Real-time notification center
- Unread count badges
- Mark as read/delete functionality
- Auto-refresh every 30 seconds

## Testing Notifications

### Test Endpoint
```bash
curl -X POST http://localhost:5000/api/notifications/test
```

This creates random test notifications to verify the system.

### User Preferences

Users can control notifications in Profile Settings:
- Email notifications on/off
- Push notifications on/off
- SMS notifications (placeholder for future Twilio integration)
- Specific notification types (trip reminders, booking updates, etc.)

## Integration Points

The notification system automatically triggers on:

1. **Trip Sharing** - When users share trips with others
2. **Booking Events** - Integration with Amadeus API booking confirmations
3. **Activity Reminders** - Based on trip dates and times
4. **Team Management** - Organization invites and updates
5. **Payment Events** - Subscription and billing notifications

## Security & Privacy

- All notification preferences stored per user
- Unsubscribe links in every email
- Push subscriptions encrypted with VAPID keys
- No personal data in notification payload
- GDPR compliant with user consent

## Implementation Notes

- Service Worker handles push notifications (`/public/sw.js`)
- Email templates use responsive HTML design
- Backend notification manager coordinates all channels
- Database storage for user preferences and push subscriptions
- Rate limiting and batching for high-volume notifications

## Troubleshooting

**Emails not sending:**
- Verify SENDGRID_API_KEY is correct
- Check SendGrid dashboard for delivery logs
- Ensure FROM_EMAIL domain is verified in SendGrid

**Push notifications not working:**
- Verify VAPID keys are properly formatted
- Check browser developer console for errors
- Ensure HTTPS is enabled (required for push notifications)
- Verify service worker is registered

**Need help?**
Check the server logs for specific error messages. All notification failures are logged with detailed error information.