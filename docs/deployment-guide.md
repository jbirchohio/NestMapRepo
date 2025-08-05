# Remvana Deployment Guide

## Overview

This guide covers deploying Remvana to production environments. The platform is designed to run on modern cloud infrastructure with support for horizontal scaling.

## System Requirements

### Minimum Requirements
- **Server**: 2 vCPUs, 4GB RAM
- **Database**: PostgreSQL 14+, 10GB storage
- **Node.js**: 18.0 or higher
- **Storage**: 20GB for application and logs
- **Network**: SSL certificate, public IP

### Recommended Production Setup
- **Application Servers**: 2-4 instances (4 vCPUs, 8GB RAM each)
- **Database**: PostgreSQL 15+ with read replicas
- **Load Balancer**: NGINX or cloud provider's LB
- **Cache**: Redis 6+ (optional but recommended)
- **CDN**: CloudFlare or AWS CloudFront
- **Monitoring**: Prometheus + Grafana or cloud monitoring

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Domain name configured
- [ ] SSL certificates obtained
- [ ] Database provisioned and secured
- [ ] Environment variables configured
- [ ] Backup strategy defined
- [ ] Monitoring tools configured

### 2. Security Hardening
- [ ] Database access restricted
- [ ] Firewall rules configured
- [ ] SSH keys configured (no password auth)
- [ ] Environment variables encrypted
- [ ] Rate limiting configured
- [ ] DDoS protection enabled

### 3. Third-Party Services
- [ ] Stripe account configured
- [ ] Duffel API access verified
- [ ] SendGrid account setup
- [ ] OpenAI API key obtained
- [ ] Error tracking service configured

## Deployment Steps

### 1. Database Setup

```bash
# Create production database
sudo -u postgres createdb remvana_production

# Create database user
sudo -u postgres createuser remvana_user -P

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE remvana_production TO remvana_user;"

# Run migrations
DATABASE_URL=postgresql://remvana_user:password@localhost/remvana_production npm run db:push

# Seed initial data (optional)
npm run seed:production
```

### 2. Application Build

```bash
# Clone repository
git clone <repository-url>
cd remvana

# Install dependencies
npm install --production

# Build frontend assets
npm run build

# The build outputs to:
# - Frontend: client/dist/
# - Backend: dist/
```

### 3. Environment Configuration

Create `.env.production`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/remvana_production

# Authentication
JWT_SECRET=<generate-secure-random-string>
SESSION_SECRET=<generate-secure-random-string>

# APIs
DUFFEL_API_KEY=<your-duffel-api-key>
OPENAI_API_KEY=<your-openai-api-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
SENDGRID_API_KEY=<your-sendgrid-api-key>

# Application
NODE_ENV=production
PORT=3000
CLIENT_URL=https://app.remvana.com
API_URL=https://api.remvana.com

# Optional Services
REDIS_URL=redis://localhost:6379
SENTRY_DSN=<your-sentry-dsn>
```

### 4. Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'remvana',
    script: './dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. NGINX Configuration

```nginx
# /etc/nginx/sites-available/remvana
server {
    listen 80;
    server_name app.remvana.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.remvana.com;

    ssl_certificate /etc/letsencrypt/live/app.remvana.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.remvana.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend static files
    location / {
        root /var/www/remvana/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6. SSL Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app.remvana.com -d api.remvana.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Database Optimization

### 1. Connection Pooling

```javascript
// In database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Indexes

```sql
-- Critical performance indexes
CREATE INDEX idx_trips_organization_id ON trips(organization_id);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_activities_trip_id ON activities(trip_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 3. Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="remvana_production"

# Create backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://remvana-backups/
```

## Monitoring Setup

### 1. Application Monitoring

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### 2. Log Aggregation

```bash
# Install log rotation
sudo apt-get install logrotate

# Configure log rotation
cat > /etc/logrotate.d/remvana << EOF
/var/log/remvana/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Metrics Collection

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'remvana'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

## Performance Optimization

### 1. Frontend Optimization
- Enable Gzip compression
- Set up CDN for static assets
- Implement browser caching headers
- Use lazy loading for routes
- Optimize images with WebP format

### 2. Backend Optimization
- Enable database connection pooling
- Implement Redis caching
- Use database read replicas
- Optimize slow queries
- Implement request queuing

### 3. Caching Strategy

```javascript
// Redis caching example
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

## Scaling Strategy

### Horizontal Scaling
1. **Application Servers**: Add more instances behind load balancer
2. **Database**: Implement read replicas for read-heavy operations
3. **Cache Layer**: Redis cluster for session and cache storage
4. **Static Assets**: CDN distribution globally

### Vertical Scaling
1. **Database**: Increase CPU/RAM as needed
2. **Application Servers**: Upgrade instance types
3. **Cache**: Increase Redis memory

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files
- Use secrets management service
- Rotate keys regularly
- Audit access logs

### 2. Database Security
- Use connection encryption (SSL)
- Implement row-level security
- Regular security updates
- Backup encryption

### 3. Application Security
- Keep dependencies updated
- Implement rate limiting
- Use HTTPS everywhere
- Regular security audits

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check PM2 memory usage
pm2 monit

# Restart with memory limit
pm2 restart remvana --max-memory-restart 1G
```

#### Database Connection Errors
```bash
# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < current_timestamp - interval '5 minutes';
```

#### Slow Performance
1. Check database query performance
2. Review application logs
3. Monitor CPU and memory usage
4. Check external API response times

## Maintenance Tasks

### Daily
- Monitor error logs
- Check system resources
- Verify backup completion
- Review security alerts

### Weekly
- Update dependencies
- Analyze performance metrics
- Review user feedback
- Database maintenance

### Monthly
- Security patches
- SSL certificate renewal check
- Capacity planning review
- Cost optimization

## Rollback Procedure

```bash
# 1. Stop current deployment
pm2 stop remvana

# 2. Restore previous version
git checkout <previous-version>
npm install
npm run build

# 3. Restore database if needed
psql remvana_production < backup.sql

# 4. Restart application
pm2 restart remvana
```

## Support Contacts

- **Technical Issues**: tech-support@remvana.com
- **Security Issues**: security@remvana.com
- **Emergency**: On-call engineer via PagerDuty
- **Documentation**: https://docs.remvana.com