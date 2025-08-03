# NestMap Production Deployment Guide

## Overview

NestMap is an enterprise-grade travel management platform designed for production deployment with high availability, security, and scalability.

## System Requirements

### Production Server
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **CPU**: 4+ cores (8+ recommended for high traffic)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD storage
- **Network**: Static IP address, SSL certificate

### Database
- **PostgreSQL**: Version 14+ required
- **Memory**: 4GB+ dedicated to PostgreSQL
- **Storage**: 500GB+ with backup strategy
- **Connections**: 100+ concurrent connections

## Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/nestmap_production"

# Authentication
JWT_SECRET="your-cryptographically-secure-jwt-secret-here"
SESSION_SECRET="your-cryptographically-secure-session-secret-here"

# External APIs
DUFFEL_API_KEY="your-duffel-api-key"
OPENAI_API_KEY="your-openai-api-key"

# Production Settings
NODE_ENV="production"
PORT="5000"
HOST="0.0.0.0"
```

### Optional Environment Variables

```bash
# Payment Processing
STRIPE_SECRET_KEY="sk_live_your-stripe-secret-key"
VITE_STRIPE_PUBLIC_KEY="pk_live_your-stripe-public-key"

# Email Service
SENDGRID_API_KEY="your-sendgrid-api-key"

# Booking APIs (Partner Access Required)
BOOKING_COM_API_KEY="your-booking-com-key"
BOOKING_COM_API_SECRET="your-booking-com-secret"
AMADEUS_CLIENT_ID="your-amadeus-client-id"
AMADEUS_CLIENT_SECRET="your-amadeus-client-secret"

# Monitoring (Optional)
SENTRY_DSN="your-sentry-dsn"
```

## Pre-Deployment Setup

### 1. Database Setup

```bash
# Create production database
sudo -u postgres createdb nestmap_production

# Create database user
sudo -u postgres psql -c "CREATE USER nestmap_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nestmap_production TO nestmap_user;"

# Test database connection
psql -h localhost -U nestmap_user -d nestmap_production -c "SELECT version();"
```

### 2. SSL Certificate Setup

```bash
# Using Let's Encrypt (recommended)
sudo apt update
sudo apt install certbot nginx

# Obtain SSL certificate
sudo certbot certonly --nginx -d yourdomain.com

# Configure automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Reverse Proxy Setup (Nginx)

```nginx
# /etc/nginx/sites-available/nestmap
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deployment Steps

### 1. Build Application

```bash
# Clone repository
git clone https://github.com/your-org/nestmap.git
cd nestmap

# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Database Migration

```bash
# Run database migrations
npm run db:push

# Verify migration success
npm run check
```

### 3. Process Management (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nestmap',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
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

### 4. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 5000  # Block direct access to Node.js
```

## Health Checks & Monitoring

### Application Health Endpoint

```bash
# Check application health
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "uptime": 86400,
  "memory": { "used": 120, "total": 512 },
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Log Monitoring

```bash
# Application logs
pm2 logs nestmap

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /opt/nestmap/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/nestmap/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="nestmap_backup_$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump -h localhost -U nestmap_user nestmap_production > $BACKUP_DIR/$BACKUP_FILE
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 30 backups
find $BACKUP_DIR -name "nestmap_backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/nestmap/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /opt/nestmap/backup-db.sh" | sudo crontab -
```

### File System Backup

```bash
# Application files backup
rsync -av --exclude node_modules --exclude logs /opt/nestmap/ /backup/nestmap/
```

## Security Hardening

### Application Security

- ✅ JWT-only authentication (no sessions)
- ✅ CORS properly configured
- ✅ Rate limiting implemented
- ✅ Input validation and sanitization
- ✅ SQL injection protection
- ✅ XSS protection headers

### Server Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Configure SSH security
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_trips_user_org ON trips(user_id, organization_id);
CREATE INDEX CONCURRENTLY idx_activities_trip_id ON activities(trip_id);
CREATE INDEX CONCURRENTLY idx_users_org_id ON users(organization_id);

-- Configure PostgreSQL settings
-- Add to /etc/postgresql/14/main/postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### Application Optimization

```bash
# Enable compression in Nginx
# Add to server block:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

## Scaling Considerations

### Horizontal Scaling

- **Load Balancer**: Use HAProxy or AWS Application Load Balancer
- **Database**: PostgreSQL read replicas for read-heavy workloads
- **File Storage**: Use AWS S3 or similar for uploaded files
- **Session Store**: Redis for session management in multi-server setup

### Vertical Scaling

- **CPU**: Scale to 8+ cores for high traffic
- **Memory**: 32GB+ for large datasets
- **Database**: Dedicated database server with 16GB+ RAM

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart if needed
sudo systemctl restart postgresql
```

#### Application Not Starting
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs nestmap --lines 100

# Restart application
pm2 restart nestmap
```

#### High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Restart if memory leak detected
pm2 restart nestmap
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check application logs and error rates
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review database performance and optimize queries
4. **Annually**: SSL certificate renewal (if not automated)

### Update Procedure

```bash
# 1. Backup current deployment
cp -r /opt/nestmap /opt/nestmap-backup-$(date +%Y%m%d)

# 2. Pull latest code
cd /opt/nestmap
git pull origin main

# 3. Install dependencies
npm ci --production

# 4. Build application
npm run build

# 5. Run migrations if needed
npm run db:push

# 6. Restart application
pm2 restart nestmap

# 7. Verify deployment
curl https://yourdomain.com/api/health
```

## Support and Monitoring

### Key Metrics to Monitor

- **Response Time**: < 500ms for API endpoints
- **Error Rate**: < 0.1% for production traffic
- **Database Performance**: Query times < 100ms
- **Memory Usage**: < 80% of available RAM
- **Disk Usage**: < 80% of available storage

### Alert Configuration

Set up alerts for:
- Application downtime
- High error rates (> 1%)
- Database connection failures
- High memory usage (> 90%)
- SSL certificate expiration

This deployment guide ensures NestMap runs securely and efficiently in production environments suitable for enterprise customers.