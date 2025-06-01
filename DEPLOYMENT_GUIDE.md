# NestMap Deployment Guide

## Production Deployment Checklist

### Environment Configuration

**Required Environment Variables:**
```bash
# Core Application
NODE_ENV=production
PORT=3000                              # Automatically detected by most platforms
BASE_URL=https://yourdomain.com        # Critical for OAuth callbacks

# Database
DATABASE_URL=postgresql://...          # Your production database URL

# Security
SESSION_SECRET=your-256-bit-secret     # Generate with: openssl rand -hex 32

# Authentication (OAuth Callbacks)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret  
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/auth/microsoft/callback

# External APIs
OPENAI_API_KEY=sk-...
AMADEUS_API_KEY=...
AMADEUS_API_SECRET=...
MAPBOX_TOKEN=pk...
VITE_MAPBOX_TOKEN=pk...
```

### Platform-Specific Deployment

#### Railway
1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically triggers on push
4. PORT is automatically configured

#### Render
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Build command: `npm run build`
4. Start command: `npm start`
5. PORT is automatically configured

#### Vercel
1. Import from GitHub
2. Framework preset: Other
3. Build command: `npm run build`
4. Output directory: `dist`
5. Install command: `npm install`

### Security Configuration

**Production Security Headers:**
- HTTPS automatically enforced
- Secure session cookies enabled
- CSRF protection active
- XSS protection headers set

**OAuth Setup:**
1. Update OAuth application redirect URIs to production URLs
2. Verify BASE_URL matches your domain exactly
3. Test OAuth flows in production environment

### White-Label Deployment

**Organization Branding:**
```bash
# Override default branding per organization
APP_NAME=YourCompany Travel
PRIMARY_COLOR=#your-brand-color
LOGO_URL=https://your-cdn.com/logo.png
SUPPORT_EMAIL=support@yourcompany.com
```

**Custom Domains:**
- Configure DNS to point to deployment platform
- SSL certificates handled automatically
- Update BASE_URL to match custom domain

### Database Migration

**Production Database Setup:**
1. Create production database (PostgreSQL recommended)
2. Run: `npm run db:push` to sync schema
3. Verify all tables created successfully
4. Test database connectivity

### Monitoring & Analytics

**Health Checks:**
- `/api/health` endpoint available
- Database connectivity verified
- External API status checked

**Performance Monitoring:**
- Response time tracking enabled
- Error logging configured
- Organization-aware analytics

### Post-Deployment Verification

**Functional Testing:**
- [ ] Application loads successfully
- [ ] User authentication works
- [ ] Trip creation functions
- [ ] Map integration displays
- [ ] OAuth calendar sync works
- [ ] Analytics dashboard loads
- [ ] White-label branding applies

**API Testing:**
- [ ] All endpoints respond correctly
- [ ] Database queries execute
- [ ] External API calls succeed
- [ ] Error handling works properly

### Troubleshooting

**Common Issues:**

1. **OAuth Redirect Mismatch:**
   - Verify BASE_URL matches deployment domain
   - Check OAuth app configuration
   - Ensure HTTPS is used in production

2. **Database Connection:**
   - Verify DATABASE_URL format
   - Check database server accessibility
   - Run migration if tables missing

3. **Environment Variables:**
   - Ensure all required variables set
   - Check for typos in variable names
   - Verify secrets are properly encoded

4. **Static Assets:**
   - Build completes successfully
   - Assets serve from correct paths
   - CDN configuration if applicable

### Scaling Considerations

**Performance Optimization:**
- Database indexing for large datasets
- CDN for static asset delivery
- Load balancing for high traffic
- Caching strategy implementation

**Multi-Tenant Scaling:**
- Organization data isolation verified
- Per-organization resource limits
- Billing integration if required
- Custom domain support

This deployment guide ensures your NestMap instance is production-ready with enterprise-grade security and performance.