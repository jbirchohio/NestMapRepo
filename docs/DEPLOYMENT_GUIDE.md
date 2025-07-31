# NestMap - Production Deployment Guide

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and pnpm
- PostgreSQL database
- Required API keys (see Environment Variables section)

### **Installation**
```bash
# Clone repository
git clone <repository-url>
cd NestMapRepo

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build shared schema
pnpm build:shared

# Start development server
pnpm dev
```

### **Production Deployment**
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 🔧 **Environment Configuration**

### **Required Environment Variables**

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h

# External API Keys
DUFFEL_API_TOKEN=your-duffel-api-token
OPENAI_API_KEY=your-openai-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
AVIATIONSTACK_API_KEY=your-aviationstack-api-key
NEWS_API_KEY=your-news-api-key

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Server Configuration
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### **API Key Setup**

#### **1. Duffel API (Flight Data)**
- Sign up at [duffel.com](https://duffel.com)
- Get API token from dashboard
- Required for flight search and booking

#### **2. OpenAI API (AI Features)**
- Sign up at [openai.com](https://openai.com)
- Create API key in dashboard
- Required for voice interface and AI recommendations

#### **3. Weather APIs (Optional)**
- OpenWeatherMap: [openweathermap.org](https://openweathermap.org)
- AviationStack: [aviationstack.com](https://aviationstack.com)
- NewsAPI: [newsapi.org](https://newsapi.org)

## 🗄️ **Database Setup**

### **PostgreSQL Configuration**

#### **Option 1: Supabase (Recommended)**
```bash
# 1. Create account at supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database
# 4. Add to DATABASE_URL in .env
```

#### **Option 2: Self-Hosted PostgreSQL**
```bash
# Install PostgreSQL
# Create database
createdb nestmap

# Update DATABASE_URL
DATABASE_URL=postgresql://username:password@localhost:5432/nestmap
```

### **Database Migration**
```bash
# Push schema to database
pnpm db:push

# Verify tables created
# Check your database for: users, organizations, trips, expenses tables
```

## 🐳 **Docker Deployment**

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  nestmap:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/nestmap
      - JWT_SECRET=your-jwt-secret
      - DUFFEL_API_TOKEN=your-duffel-token
      - OPENAI_API_KEY=your-openai-key
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=nestmap
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## ☁️ **Cloud Deployment**

### **AWS Deployment**

#### **Using AWS ECS**
```bash
# 1. Build and push Docker image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t nestmap .
docker tag nestmap:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nestmap:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nestmap:latest

# 2. Create ECS service with RDS PostgreSQL
# 3. Configure load balancer and auto-scaling
```

#### **Using AWS Lambda (Serverless)**
```bash
# Install serverless framework
npm install -g serverless

# Deploy with serverless
serverless deploy
```

### **Google Cloud Deployment**

#### **Using Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/nestmap
gcloud run deploy --image gcr.io/PROJECT-ID/nestmap --platform managed
```

### **Azure Deployment**

#### **Using Container Instances**
```bash
# Create resource group
az group create --name nestmap-rg --location eastus

# Deploy container
az container create --resource-group nestmap-rg --name nestmap --image nestmap:latest --ports 3000
```

## 🔒 **Security Configuration**

### **Production Security Checklist**

- [x] **Environment Variables**: Never commit secrets to version control
  - ✅ `.env` files in `.gitignore`
  - ✅ `.env.example` template provided
  - ✅ Environment validation on server startup

- [x] **HTTPS**: Use SSL certificates in production
  - ✅ Express server configured for HTTPS
  - ✅ Helmet middleware enforces HTTPS redirects
  - ✅ Secure cookie settings for production

- [x] **CORS**: Configure allowed origins
  - ✅ CORS middleware configured in `server/index.ts`
  - ✅ Environment-based origin configuration
  - ✅ Credentials and preflight handling enabled

- [x] **Rate Limiting**: Enable API rate limiting
  - ✅ Express rate limit middleware implemented
  - ✅ Different limits for auth vs general API endpoints
  - ✅ Configurable limits via environment variables

- [x] **Helmet**: Security headers enabled
  - ✅ Helmet middleware configured with CSP
  - ✅ XSS protection and HSTS enabled
  - ✅ Content type sniffing prevention

- [x] **JWT**: Use strong secret keys
  - ✅ JWT secret configurable via environment
  - ✅ Token expiration configured (24h default)
  - ✅ Secure token validation middleware

- [x] **Database**: Use connection pooling and SSL
  - ✅ Drizzle ORM with connection pooling
  - ✅ SSL mode configurable for production
  - ✅ Prepared statements prevent SQL injection

- [x] **Input Validation**: Comprehensive request validation
  - ✅ Zod schemas for all API endpoints
  - ✅ Request sanitization middleware
  - ✅ File upload validation and limits

- [x] **Authentication**: Secure user authentication
  - ✅ Bcrypt password hashing (12 rounds)
  - ✅ JWT-based stateless authentication
  - ✅ Organization-scoped data access

- [x] **Audit Logging**: Security event tracking
  - ✅ Winston logger with structured logging
  - ✅ Authentication attempts logged
  - ✅ Error tracking and monitoring

### **Security Headers**
```javascript
// Already configured in server/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📊 **Monitoring & Logging**

### **Health Check Endpoint**
```
GET /health
```
Returns server status and database connectivity.

### **Logging**
- Winston logger configured for production
- Log files stored in `server/logs/`
- Error tracking and performance monitoring

### **Monitoring Setup**
```bash
# Recommended monitoring tools
# - DataDog
# - New Relic
# - Sentry for error tracking
# - Grafana for metrics visualization
```

## 🔄 **Backup & Recovery**

### **Database Backup**
```bash
# Automated daily backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20240101.sql
```

### **File Backup**
- Code repository: Git with multiple remotes
- Environment configs: Secure vault storage
- Database: Automated daily backups
- Logs: Centralized logging service

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
- Load balancer (AWS ALB, Google Cloud Load Balancer)
- Multiple server instances
- Database read replicas
- CDN for static assets

### **Performance Optimization**
- Database indexing and query optimization
- Redis caching layer (optional)
- Image optimization and compression
- API response caching

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Server Won't Start**
```bash
# Check environment variables
cat .env

# Check database connection
pnpm db:push

# Check logs
tail -f server/logs/error.log
```

#### **Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL

# Check database schema
pnpm db:push
```

#### **API Key Issues**
```bash
# Verify API keys are set
echo $DUFFEL_API_TOKEN
echo $OPENAI_API_KEY

# Test API endpoints
curl -H "Authorization: Bearer $DUFFEL_API_TOKEN" https://api.duffel.com/air/airports
```

## 📞 **Support & Maintenance**

### **Regular Maintenance**
- [ ] Weekly dependency updates
- [ ] Monthly security patches
- [ ] Quarterly performance reviews
- [ ] Database optimization and cleanup

### **Monitoring Checklist**
- [ ] Server uptime and response times
- [ ] Database performance and storage
- [ ] API rate limits and quotas
- [ ] Error rates and user feedback

---

**This guide outlines how the project might be deployed. The current repository is not production ready and additional work is required before a real deployment.**
