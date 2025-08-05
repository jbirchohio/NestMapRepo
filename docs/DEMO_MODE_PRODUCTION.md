# Demo Mode Production Deployment Guide

This guide explains how to deploy Remvana with demo mode enabled on a live production site where real users and demo users can coexist.

## Production Demo Mode Architecture

### Overview
- Demo users are isolated from real users using `.demo` email domains
- Demo data automatically resets every 30 minutes
- Real user data is never affected by demo operations
- Demo users have restricted permissions (no real bookings, payments, or emails)

## Deployment Steps

### 1. Environment Configuration

Add these variables to your production `.env` file:

```bash
# Enable demo mode
ENABLE_DEMO_MODE=true
DEMO_RESET_INTERVAL=30

# Optional: Separate demo subdomain
DEMO_SUBDOMAIN=demo.remvana.com
```

### 2. Database Setup

1. **Seed Initial Demo Data**:
```bash
# SSH into your production server
npm run seed:demo
```

This creates:
- 3 demo organizations
- 6 demo users (all with `.demo` email domains)
- Sample trips and activities

2. **Verify Demo Data**:
```sql
-- Check demo users were created
SELECT username, email, role FROM users WHERE email LIKE '%.demo';
```

### 3. Demo Reset Scheduler

The demo reset service automatically cleans up demo data every 30 minutes. It's started automatically when `ENABLE_DEMO_MODE=true`.

**What gets reset**:
- Non-core trips created by demo users
- Activities created in the last 30 minutes
- Expenses from the last 30 minutes

**What's preserved**:
- Demo user accounts
- Core sample trips
- Organization settings

### 4. Nginx Configuration (Optional)

For a dedicated demo subdomain:

```nginx
# Demo subdomain configuration
server {
    listen 443 ssl http2;
    server_name demo.remvana.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/demo.remvana.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.remvana.com/privkey.pem;
    
    # Set demo header
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Demo-Mode "true";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect demo.remvana.com to demo page
server {
    listen 80;
    server_name demo.remvana.com;
    return 301 https://demo.remvana.com/demo;
}
```

### 5. Security Considerations

1. **Rate Limiting**: Demo users have stricter rate limits
   - 100 requests/minute per demo user
   - 1000 requests/hour per demo IP

2. **Data Isolation**: 
   - Demo users can only see demo organization data
   - No access to real user information
   - Cannot modify system settings

3. **API Restrictions**:
   - No external API calls (Stripe, SendGrid, etc.)
   - Flight searches return cached demo data
   - Email notifications are disabled

### 6. Monitoring Demo Usage

Monitor demo usage with these endpoints:

```bash
# Check demo status
curl https://your-domain.com/api/demo/status

# Get demo statistics
curl https://your-domain.com/api/demo/stats

# Manual reset (requires admin auth)
curl -X POST https://your-domain.com/api/demo/reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 7. Marketing Integration

1. **Landing Page**: The demo page is available at `/demo`
2. **Quick Links**: 
   - "Try Demo" button on homepage
   - Demo banner for demo users
   - Auto-logout after 30 minutes of inactivity

3. **Demo URLs for Marketing**:
```
# Direct demo links by role
https://remvana.com/demo?role=admin
https://remvana.com/demo?role=manager
https://remvana.com/demo?role=user

# Quick start demo
https://remvana.com/api/demo/quick-login
```

## Maintenance

### Daily Tasks
- Monitor demo reset logs for errors
- Check demo user count doesn't exceed limits
- Verify core demo data integrity

### Weekly Tasks
- Review demo usage analytics
- Clean up orphaned demo sessions
- Update demo content if needed

### Troubleshooting

**Issue**: Demo resets failing
```bash
# Check reset service logs
journalctl -u remvana -f | grep "demo reset"

# Manually trigger reset
npm run script:demo-reset
```

**Issue**: Demo users can't login
```bash
# Verify demo users exist
psql $DATABASE_URL -c "SELECT * FROM users WHERE email LIKE '%.demo';"

# Reseed if needed
npm run seed:demo
```

**Issue**: Real users seeing demo banner
- Check user email doesn't contain '.demo'
- Verify `isDemoUser` logic in `DemoModeBanner.tsx`

## Best Practices

1. **Performance**:
   - Demo resets run in background workers
   - Use database indexes on demo user queries
   - Cache demo status checks

2. **User Experience**:
   - Clear messaging about demo limitations
   - Prominent "Start Free Trial" CTAs
   - Smooth transition from demo to real account

3. **Analytics**:
   - Track demo-to-trial conversion rates
   - Monitor which features demos explore most
   - A/B test different demo flows

## Disabling Demo Mode

To disable demo mode in production:

1. Set `ENABLE_DEMO_MODE=false` in `.env`
2. Remove demo users (optional):
```sql
DELETE FROM activities WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%.demo');
DELETE FROM trips WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo');
DELETE FROM users WHERE email LIKE '%.demo';
```
3. Restart the application
4. Remove demo subdomain DNS/nginx config

## Support

For issues with demo mode:
- Check logs: `journalctl -u remvana -f`
- Review demo service: `server/services/demoResetService.ts`
- Contact: support@remvana.com