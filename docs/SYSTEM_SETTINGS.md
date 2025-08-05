# Remvana System Settings Documentation

## Overview
System Settings control the global behavior of the Remvana platform. These settings are managed through the superadmin dashboard and take effect immediately (unless marked as requiring restart).

## Settings by Category

### 🔑 API Settings
These control third-party service integrations:

- **stripe_secret_key**: Stripe API key for payment processing and corporate cards
- **sendgrid_api_key**: SendGrid API key for transactional emails
- **openai_api_key**: OpenAI API key for AI-powered features (trip generation, recommendations)
- **duffel_api_key**: Duffel API key for real-time flight search and booking
- **mapbox_api_key**: Mapbox API key for interactive maps and location services

### 📧 Email Settings
Configure email delivery:

- **smtp_host**: SMTP server hostname (default: smtp.sendgrid.net)
- **smtp_port**: SMTP server port (default: 587)
- **smtp_username**: SMTP authentication username
- **smtp_password**: SMTP authentication password
- **from_email**: Default sender email address
- **support_email**: Support contact email address

### 🛡️ Security Settings
Control platform security:

- **rate_limit_requests**: Maximum API requests per window (default: 100)
- **rate_limit_window**: Rate limit time window in seconds (default: 60)
- **allowed_cors_origins**: Comma-separated list of allowed CORS origins
- **session_timeout**: Session timeout in seconds (default: 86400 = 24 hours)
- **max_login_attempts**: Failed login attempts before lockout (default: 5)
- **lockout_duration**: Account lockout duration in seconds (default: 900 = 15 min)

### 🌐 Platform Settings
Default platform behavior:

- **default_trial_days**: Trial period for new organizations (default: 14 days)
- **default_organization_seats**: Default user seats for new organizations (default: 5)
- **default_storage_gb**: Default storage allocation per organization (default: 10 GB)
- **enable_signups**: Allow public signups (default: true)
- **require_email_verification**: Require email verification for new users (default: true)

### 🔧 Maintenance Settings
System maintenance controls:

- **maintenance_mode**: Enable/disable maintenance mode (default: false)
- **maintenance_message**: Message shown during maintenance
- **backup_enabled**: Enable automated database backups (default: true)
- **backup_frequency**: Backup schedule - "daily" or "weekly" (default: daily)
- **backup_retention_days**: Days to keep backup files (default: 30)

### ⚡ Performance Settings
Optimize system performance:

- **cache_enabled**: Enable response caching (default: true)
- **cache_ttl**: Cache time-to-live in seconds (default: 3600 = 1 hour)
- **max_upload_size_mb**: Maximum file upload size in MB (default: 100)
- **database_pool_size**: Database connection pool size (default: 10) *[requires restart]*

### 🎨 Branding Settings
Default white-label settings:

- **default_primary_color**: Default brand color for new organizations (default: #3B82F6)
- **default_logo_url**: Default logo URL (default: /logo.svg)
- **platform_name**: Platform name shown in UI (default: Remvana)
- **platform_tagline**: Platform tagline (default: Enterprise Travel Management)

## How Settings Work

### Immediate Effect Settings
Most settings take effect immediately when saved:
- Rate limiting adjusts in real-time
- CORS origins update instantly
- Maintenance mode activates immediately
- Cache settings apply to new requests

### Restart Required Settings
Some settings require server restart:
- database_pool_size
- smtp_host (email server change)
- smtp_port (email port change)

### Security Notes
- All sensitive settings (API keys, passwords) are masked in the UI
- Changes to sensitive settings are logged without exposing values
- API keys are never returned in plain text after initial entry

### Platform Integration
Settings are used throughout the platform:
- **Rate Limiting**: Enforced by comprehensive-rate-limiting middleware
- **CORS**: Applied by security middleware on all requests
- **Email**: Used by email service for all outbound emails
- **Backups**: Scheduled automatically based on settings
- **Cache**: Applied to API responses for performance
- **Maintenance Mode**: Blocks all non-admin access when enabled

## Best Practices

1. **API Keys**: Always use production keys in production environment
2. **Rate Limits**: Set based on your infrastructure capacity
3. **Backups**: Keep enabled with appropriate retention
4. **Cache**: Adjust TTL based on data freshness requirements
5. **Security**: Regularly review login attempts and lockout settings
6. **Maintenance**: Plan maintenance windows and set clear messages