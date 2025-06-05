# NestMap Deployment & Operations Guide
## Enterprise Production Deployment and Operations Manual

---

## Table of Contents

1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Docker Configuration](#docker-configuration)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Database Management](#database-management)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Scaling Strategies](#scaling-strategies)
11. [Operational Procedures](#operational-procedures)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Infrastructure Requirements

### Minimum System Requirements

#### Production Environment
- **CPU**: 8 cores (16 vCPUs recommended)
- **RAM**: 32GB (64GB recommended)
- **Storage**: 500GB SSD (1TB recommended)
- **Network**: 1Gbps bandwidth
- **Load Balancer**: Required for high availability

#### Database Server
- **CPU**: 4 cores (8 vCPUs recommended)
- **RAM**: 16GB (32GB recommended)
- **Storage**: 200GB SSD with 3000 IOPS minimum
- **Backup Storage**: 500GB for automated backups

#### Redis Cache Server
- **CPU**: 2 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: Low latency connection to application servers

### Cloud Provider Specifications

#### AWS Deployment
```yaml
# Recommended AWS instance types
application_servers:
  instance_type: c5.2xlarge
  min_instances: 2
  max_instances: 10
  
database:
  instance_type: db.r5.xlarge
  storage: gp3
  iops: 3000
  
cache:
  instance_type: cache.r6g.large
  
load_balancer:
  type: Application Load Balancer
  scheme: internet-facing
```

#### Azure Deployment
```yaml
# Recommended Azure VM sizes
application_servers:
  vm_size: Standard_D8s_v3
  min_instances: 2
  max_instances: 10
  
database:
  sku: GP_Gen5_4
  storage: 200GB
  
cache:
  sku: Standard_C3
  
load_balancer:
  type: Standard
  tier: Regional
```

#### Google Cloud Platform
```yaml
# Recommended GCP machine types
application_servers:
  machine_type: c2-standard-8
  min_instances: 2
  max_instances: 10
  
database:
  tier: db-custom-4-15360
  storage_type: SSD
  storage_size: 200GB
  
cache:
  tier: standard-ha
  memory_size: 8GB
```

---

## Pre-Deployment Setup

### Environment Variables Configuration

#### Required Environment Variables
```bash
# Application Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=your_secure_session_secret_here

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=your_postgres_host
PGPORT=5432
PGUSER=nestmap_user
PGPASSWORD=secure_database_password
PGDATABASE=nestmap_production

# Redis Configuration
REDIS_URL=redis://username:password@host:port

# JWT Configuration
JWT_SECRET=your_jwt_secret_256_bit_key
JWT_REFRESH_SECRET=your_refresh_secret_256_bit_key

# Encryption
ENCRYPTION_KEY=your_aes_256_encryption_key

# External API Keys
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
OPENAI_API_KEY=your_openai_api_key

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### Security Considerations
```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -hex 32     # For ENCRYPTION_KEY
openssl rand -base64 64  # For SESSION_SECRET

# Validate environment variables
./scripts/validate-env.sh
```

### SSL/TLS Certificate Setup

#### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Custom Certificate Configuration
```nginx
# nginx.conf SSL configuration
ssl_certificate /etc/ssl/certs/your-domain.crt;
ssl_certificate_key /etc/ssl/private/your-domain.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

---

## Docker Configuration

### Multi-Stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestmap -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestmap:nodejs /app/dist ./dist
COPY --from=builder --chown=nestmap:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestmap:nodejs /app/package.json ./

# Create required directories
RUN mkdir -p /app/logs && chown nestmap:nodejs /app/logs
RUN mkdir -p /app/uploads && chown nestmap:nodejs /app/uploads

# Security hardening
RUN apk add --no-cache dumb-init
RUN rm -rf /var/cache/apk/*

# Switch to non-root user
USER nestmap

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Expose port
EXPOSE 5000

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server/index.js"]
```

### Docker Compose for Development
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://nestmap:password@db:5432/nestmap
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nestmap
      POSTGRES_USER: nestmap
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### Production Docker Compose
```yaml
version: '3.8'

services:
  app:
    image: nestmap:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    networks:
      - backend
      - frontend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    networks:
      - frontend
    depends_on:
      - app

networks:
  frontend:
  backend:
```

---

## Kubernetes Deployment

### Namespace Configuration
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nestmap
  labels:
    name: nestmap
```

### ConfigMap for Environment Variables
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nestmap-config
  namespace: nestmap
data:
  NODE_ENV: "production"
  PORT: "5000"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://your-domain.com"
```

### Secret Management
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nestmap-secrets
  namespace: nestmap
type: Opaque
stringData:
  DATABASE_URL: "postgresql://username:password@postgres:5432/nestmap"
  JWT_SECRET: "your-jwt-secret"
  STRIPE_SECRET_KEY: "sk_live_your_stripe_key"
  ENCRYPTION_KEY: "your-encryption-key"
```

### Application Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestmap-app
  namespace: nestmap
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestmap-app
  template:
    metadata:
      labels:
        app: nestmap-app
    spec:
      containers:
      - name: nestmap
        image: nestmap:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: nestmap-config
        - secretRef:
            name: nestmap-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### Service Configuration
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nestmap-service
  namespace: nestmap
spec:
  selector:
    app: nestmap-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
```

### Ingress with SSL
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nestmap-ingress
  namespace: nestmap
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: nestmap-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nestmap-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nestmap-hpa
  namespace: nestmap
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nestmap-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Database Management

### PostgreSQL Configuration

#### High-Performance Configuration
```sql
-- postgresql.conf optimizations
shared_buffers = '8GB'
effective_cache_size = '24GB'
work_mem = '64MB'
maintenance_work_mem = '1GB'
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 200
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
```

#### Database Initialization Script
```sql
-- init-production.sql
CREATE DATABASE nestmap_production;
CREATE USER nestmap_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nestmap_production TO nestmap_user;

-- Enable required extensions
\c nestmap_production;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set up connection pooling user
CREATE USER nestmap_pool WITH ENCRYPTED PASSWORD 'pool_password';
GRANT CONNECT ON DATABASE nestmap_production TO nestmap_pool;
GRANT USAGE ON SCHEMA public TO nestmap_pool;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nestmap_pool;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nestmap_pool;
```

#### Database Backup Strategy
```bash
#!/bin/bash
# backup-database.sh

DB_NAME="nestmap_production"
DB_USER="nestmap_user"
BACKUP_DIR="/var/backups/nestmap"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/nestmap_backup_$DATE.sql.gz

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: nestmap_backup_$DATE.sql.gz"
else
    echo "Backup failed!" >&2
    exit 1
fi

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "nestmap_backup_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/nestmap_backup_$DATE.sql.gz s3://your-backup-bucket/database/
```

#### Database Monitoring Queries
```sql
-- Monitor active connections
SELECT 
    state,
    count(*) as connections
FROM pg_stat_activity 
WHERE datname = 'nestmap_production'
GROUP BY state;

-- Monitor slow queries
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Migration Management
```bash
#!/bin/bash
# run-migrations.sh

set -e

echo "Running database migrations..."

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;" > /dev/null

if [ $? -ne 0 ]; then
    echo "Cannot connect to database. Exiting."
    exit 1
fi

# Run migrations
npm run db:migrate

# Verify migration status
npm run db:migrate:status

echo "Migrations completed successfully."
```

---

## Security Hardening

### Application Security

#### Express.js Security Middleware
```javascript
// security.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

export const securityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Sanitize user input
  app.use(mongoSanitize());
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
};
```

#### JWT Security Implementation
```javascript
// jwt-security.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class JWTSecurity {
  static generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }

  static signToken(payload, options = {}) {
    const defaultOptions = {
      issuer: 'nestmap',
      audience: 'nestmap-users',
      expiresIn: '15m',
      algorithm: 'RS256'
    };

    return jwt.sign(payload, process.env.JWT_PRIVATE_KEY, {
      ...defaultOptions,
      ...options
    });
  }

  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
      issuer: 'nestmap',
      audience: 'nestmap-users',
      algorithms: ['RS256']
    });
  }
}
```

### Infrastructure Security

#### Firewall Configuration
```bash
#!/bin/bash
# configure-firewall.sh

# UFW (Ubuntu Firewall) configuration
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port as needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow database access from application servers only
sudo ufw allow from 10.0.1.0/24 to any port 5432

# Allow Redis access from application servers only
sudo ufw allow from 10.0.1.0/24 to any port 6379

# Enable firewall
sudo ufw --force enable

# Fail2ban configuration
sudo apt-get install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure fail2ban for SSH and Nginx
cat << EOF > /etc/fail2ban/jail.local
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

#### Nginx Security Configuration
```nginx
# nginx-security.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com";

    # Hide Nginx version
    server_tokens off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # DDoS protection
    client_body_timeout 10s;
    client_header_timeout 10s;
    keepalive_timeout 5s 5s;
    send_timeout 10s;

    # File upload limits
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers for proxied requests
        proxy_set_header X-Frame-Options DENY;
        proxy_set_header X-Content-Type-Options nosniff;
    }

    # Block common attack patterns
    location ~ (\.env|\.git|\.svn|\.htaccess) {
        deny all;
        return 404;
    }

    # Logging
    access_log /var/log/nginx/nestmap_access.log;
    error_log /var/log/nginx/nestmap_error.log;
}
```

---

## Monitoring & Alerting

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "nestmap_rules.yml"

scrape_configs:
  - job_name: 'nestmap-app'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Application Metrics Implementation
```javascript
// metrics.js
import prometheus from 'prom-client';

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });

  next();
};

// Metrics endpoint
export const getMetrics = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};
```

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "NestMap Application Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])",
            "legendFormat": "Average query time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules
```yaml
# nestmap_rules.yml
groups:
- name: nestmap
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s"

  - alert: DatabaseConnectionsHigh
    expr: postgresql_connections_active / postgresql_connections_max > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Database connections high"
      description: "Database connection usage is {{ $value | humanizePercentage }}"

  - alert: MemoryUsageHigh
    expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value | humanizePercentage }}"
```

---

## Backup & Recovery

### Automated Backup Strategy
```bash
#!/bin/bash
# comprehensive-backup.sh

set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/var/backups/nestmap"
S3_BUCKET="nestmap-backups"

# Create backup directories
mkdir -p $BACKUP_ROOT/{database,uploads,logs,config}

echo "Starting comprehensive backup at $(date)"

# Database backup
echo "Backing up database..."
pg_dump $DATABASE_URL | gzip > $BACKUP_ROOT/database/nestmap_db_$BACKUP_DATE.sql.gz

# Application uploads backup
echo "Backing up user uploads..."
if [ -d "/app/uploads" ]; then
    tar -czf $BACKUP_ROOT/uploads/uploads_$BACKUP_DATE.tar.gz -C /app uploads/
fi

# Configuration backup
echo "Backing up configuration..."
cp /app/.env.production $BACKUP_ROOT/config/env_$BACKUP_DATE
cp /etc/nginx/nginx.conf $BACKUP_ROOT/config/nginx_$BACKUP_DATE.conf

# Log files backup (last 7 days)
echo "Backing up recent logs..."
find /var/log/nestmap -name "*.log" -mtime -7 | tar -czf $BACKUP_ROOT/logs/logs_$BACKUP_DATE.tar.gz -T -

# Upload to S3
echo "Uploading to S3..."
aws s3 sync $BACKUP_ROOT/ s3://$S3_BUCKET/backups/$BACKUP_DATE/

# Verify backup integrity
echo "Verifying backup integrity..."
gunzip -t $BACKUP_ROOT/database/nestmap_db_$BACKUP_DATE.sql.gz
if [ $? -eq 0 ]; then
    echo "Database backup verified successfully"
else
    echo "Database backup verification failed!" >&2
    exit 1
fi

# Clean up local backups older than 3 days
find $BACKUP_ROOT -type f -mtime +3 -delete

# Clean up S3 backups older than 30 days
aws s3 ls s3://$S3_BUCKET/backups/ | grep -E "^[0-9]{8}_[0-9]{6}/$" | head -n -30 | awk '{print $2}' | xargs -I {} aws s3 rm s3://$S3_BUCKET/backups/{} --recursive

echo "Backup completed successfully at $(date)"

# Send notification
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"NestMap backup completed successfully: $BACKUP_DATE\"}" \
  $SLACK_WEBHOOK_URL
```

### Disaster Recovery Procedures
```bash
#!/bin/bash
# disaster-recovery.sh

set -e

RECOVERY_DATE="$1"
BACKUP_ROOT="/var/backups/nestmap"
S3_BUCKET="nestmap-backups"

if [ -z "$RECOVERY_DATE" ]; then
    echo "Usage: $0 <YYYYMMDD_HHMMSS>"
    echo "Available backups:"
    aws s3 ls s3://$S3_BUCKET/backups/ | grep "PRE"
    exit 1
fi

echo "Starting disaster recovery for backup: $RECOVERY_DATE"

# Download backup from S3
echo "Downloading backup from S3..."
mkdir -p $BACKUP_ROOT/recovery
aws s3 sync s3://$S3_BUCKET/backups/$RECOVERY_DATE/ $BACKUP_ROOT/recovery/

# Restore database
echo "Restoring database..."
dropdb --if-exists nestmap_production
createdb nestmap_production
gunzip -c $BACKUP_ROOT/recovery/database/nestmap_db_$RECOVERY_DATE.sql.gz | psql nestmap_production

# Restore uploads
echo "Restoring uploads..."
if [ -f "$BACKUP_ROOT/recovery/uploads/uploads_$RECOVERY_DATE.tar.gz" ]; then
    tar -xzf $BACKUP_ROOT/recovery/uploads/uploads_$RECOVERY_DATE.tar.gz -C /app/
fi

# Restore configuration
echo "Restoring configuration..."
cp $BACKUP_ROOT/recovery/config/env_$RECOVERY_DATE /app/.env.production
cp $BACKUP_ROOT/recovery/config/nginx_$RECOVERY_DATE.conf /etc/nginx/nginx.conf

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart nestmap

# Verify recovery
echo "Verifying recovery..."
sleep 10
curl -f http://localhost:5000/health || {
    echo "Health check failed after recovery!" >&2
    exit 1
}

echo "Disaster recovery completed successfully"

# Send notification
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"NestMap disaster recovery completed successfully from backup: $RECOVERY_DATE\"}" \
  $SLACK_WEBHOOK_URL
```

---

## Performance Optimization

### Database Optimization
```sql
-- performance-indexes.sql
-- Optimize common query patterns

-- Trip queries by organization and date
CREATE INDEX CONCURRENTLY idx_trips_org_date ON trips(organization_id, start_date) WHERE deleted_at IS NULL;

-- Booking queries by trip and status
CREATE INDEX CONCURRENTLY idx_bookings_trip_status ON bookings(trip_id, status) WHERE status != 'cancelled';

-- User authentication queries
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE active = true;

-- Analytics queries
CREATE INDEX CONCURRENTLY idx_trips_analytics ON trips(organization_id, created_at, status) INCLUDE (budget, trip_type);

-- Corporate card transaction queries
CREATE INDEX CONCURRENTLY idx_card_transactions ON corporate_card_transactions(card_id, created_at DESC);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_trips_search ON trips USING gin(to_tsvector('english', title || ' ' || COALESCE(city, '') || ' ' || COALESCE(country, '')));

-- Analyze tables after index creation
ANALYZE trips;
ANALYZE bookings;
ANALYZE users;
ANALYZE corporate_card_transactions;
```

### Application Caching Strategy
```javascript
// cache-strategy.js
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

export class CacheManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.memoryCache = new LRUCache({
      max: 1000,
      ttl: 60 * 1000 // 1 minute
    });
  }

  // Multi-level caching with fallback
  async get(key, fetcher, options = {}) {
    const { ttl = 300, useMemory = true } = options;

    // Check memory cache first (L1)
    if (useMemory) {
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }

    // Check Redis cache (L2)
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      
      // Populate memory cache
      if (useMemory) {
        this.memoryCache.set(key, parsed);
      }
      
      return parsed;
    }

    // Fetch from source (L3)
    const result = await fetcher();
    
    // Cache the result
    await this.set(key, result, ttl);
    
    return result;
  }

  async set(key, value, ttl = 300) {
    // Set in Redis
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // Set in memory with shorter TTL
    this.memoryCache.set(key, value);
  }

  async invalidate(pattern) {
    // Invalidate Redis keys
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Invalidate memory cache
    for (const [key] of this.memoryCache.entries()) {
      if (this.matchPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  matchPattern(str, pattern) {
    return new RegExp(pattern.replace(/\*/g, '.*')).test(str);
  }
}

// Usage in API routes
export const cacheManager = new CacheManager();

// Example: Cached trip lookup
export async function getCachedTrip(tripId, organizationId) {
  return cacheManager.get(
    `trip:${tripId}:${organizationId}`,
    async () => {
      return await db.query.trips.findFirst({
        where: and(
          eq(trips.id, tripId),
          eq(trips.organizationId, organizationId)
        )
      });
    },
    { ttl: 600 } // 10 minutes
  );
}
```

### CDN Configuration
```javascript
// cdn-config.js
export const cdnConfig = {
  // CloudFront distribution settings
  cloudfront: {
    origins: [
      {
        id: 'nestmap-api',
        domainName: 'api.nestmap.com',
        customOriginConfig: {
          httpPort: 443,
          httpsPort: 443,
          originProtocolPolicy: 'https-only',
          originSslProtocols: ['TLSv1.2']
        }
      }
    ],
    behaviors: [
      {
        pathPattern: '/api/static/*',
        targetOriginId: 'nestmap-api',
        cachePolicyId: 'caching-optimized',
        compress: true,
        viewerProtocolPolicy: 'redirect-to-https'
      },
      {
        pathPattern: '/api/*',
        targetOriginId: 'nestmap-api',
        cachePolicyId: 'caching-disabled',
        compress: false,
        viewerProtocolPolicy: 'redirect-to-https'
      }
    ]
  },

  // Cache headers for static assets
  staticAssetHeaders: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': true,
    'Last-Modified': true
  },

  // Cache headers for API responses
  apiCacheHeaders: {
    publicEndpoints: {
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'Vary': 'Accept-Encoding'
    },
    privateEndpoints: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
};
```

---

This comprehensive deployment and operations guide provides enterprise-grade procedures for deploying, securing, monitoring, and maintaining NestMap in production environments. The guide covers everything from basic infrastructure setup to advanced performance optimization and disaster recovery procedures.
