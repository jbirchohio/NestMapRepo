# Remvana - Enterprise Travel Management Platform

🚀 **A complete, production-ready B2B SaaS platform for corporate travel management**

Remvana is a comprehensive enterprise travel management solution with multi-tenant architecture, white-label capabilities, and advanced administrative tools. Built with modern technologies and battle-tested in production environments.

## 🏆 Key Business Features

### For Enterprise Customers
- **Corporate Travel Management**: Complete trip planning, booking, and expense tracking
- **Team Collaboration**: Real-time collaboration on trip planning with live updates
- **Expense Management**: Automated expense tracking and reporting
- **Policy Compliance**: Configurable travel policies and approval workflows
- **White-Label Support**: Full branding customization per organization
- **Corporate Card Integration**: Stripe Issuing for expense management

### For Platform Operators
- **Comprehensive Superadmin Dashboard**: Full platform control and monitoring
- **Revenue Analytics**: MRR tracking, churn analysis, and growth metrics
- **Customer Success Tools**: Health scoring, engagement tracking, and support tools
- **A/B Testing Framework**: Built-in experimentation for pricing and features
- **Multi-Channel Communications**: Announcements, emails, and in-app messaging
- **Advanced Monitoring**: Real-time system health and performance metrics

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** + **shadcn/ui** components
- **TanStack Query** for data fetching
- **Framer Motion** for animations

### Backend
- **Node.js** + **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for type-safe database queries
- **JWT Authentication** with role-based access control
- **WebSocket** support for real-time features

### Integrations
- **Stripe**: Payments, subscriptions, and corporate cards
- **Duffel API**: Real-time flight search and booking
- **OpenAI**: AI-powered travel suggestions
- **SendGrid**: Transactional emails
- **Monitoring**: Custom performance tracking

## 🎮 Demo Mode

Try Remvana without signing up! Demo mode provides full access to explore all features with sample data that automatically resets every 30 minutes.

**Quick Demo Access**:
```bash
# Enable demo mode in .env
ENABLE_DEMO_MODE=true

# Seed demo data
npm run seed:demo

# Start the server
npm run dev
```

**Demo Credentials**:
- Admin: `sarah.chen@techcorp.demo` / `demo123`
- Manager: `mike.rodriguez@techcorp.demo` / `demo123`
- User: `emma.thompson@techcorp.demo` / `demo123`

See [Demo Mode Guide](docs/DEMO_MODE.md) for complete documentation.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Stripe account (optional)
- Duffel API key (for flight features)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd Remvana
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/remvana
JWT_SECRET=your-secure-jwt-secret
DUFFEL_API_KEY=your-duffel-api-key
OPENAI_API_KEY=your-openai-api-key
```

3. **Set up the database**
```bash
# Run migrations
npm run db:push

# Seed demo data (includes superadmin user)
npm run seed
```

4. **Start the development server**
```bash
npm run dev
```

Access the application at `http://localhost:5000`

### Default Superadmin Login
- Email: `admin@remvana.com`
- Password: `admin123`

## 📊 Superadmin Dashboard Features

### 1. **Revenue & Billing**
- Real-time MRR/ARR tracking
- Subscription analytics
- Churn analysis
- Payment failure monitoring
- Customer lifetime value (LTV)

### 2. **System Monitoring**
- Real-time performance metrics
- API endpoint monitoring
- Database performance tracking
- Error rate analysis
- Service health checks

### 3. **Customer Management**
- Organization management
- User analytics
- Engagement tracking
- Customer success scoring
- Support ticket system

### 4. **Growth Tools**
- A/B testing framework
- Feature flags with targeting
- Pricing experiments
- Conversion funnel analysis
- User segmentation

### 5. **Operations**
- Deployment management
- SSL certificate monitoring
- Backup management
- Audit trail
- Background job monitoring

### 6. **Communications**
- Announcement system
- Email campaigns
- In-app notifications
- Changelog management
- Product updates

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: Granular permission system
- **Rate Limiting**: DDoS protection
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content security policies
- **Audit Logging**: Comprehensive activity tracking
- **Data Encryption**: At-rest and in-transit

## 🏗 Architecture Highlights

### Multi-Tenant Design
- Organization-based data isolation
- Domain-based tenant resolution
- Per-tenant feature flags
- Customizable branding per organization

### Performance Optimizations
- Database connection pooling
- Redis caching (optional)
- Lazy loading and code splitting
- Optimized database queries
- CDN-ready static assets

### Scalability
- Horizontal scaling support
- Database read replicas support
- Queue-based background jobs
- WebSocket clustering
- Microservice-ready architecture

## 📈 Business Metrics Tracked

- **Revenue**: MRR, ARR, growth rate, churn
- **Users**: DAU, MAU, retention, engagement
- **Performance**: Response times, error rates, uptime
- **Features**: Usage, adoption, A/B test results
- **Support**: Ticket volume, resolution time, CSAT

## 🚢 Deployment

### Production Requirements
- Node.js 18+ with PM2 or similar
- PostgreSQL 14+ with backups
- SSL certificates (Let's Encrypt supported)
- Minimum 2GB RAM, 2 vCPUs
- Object storage for file uploads (optional)

### Environment Variables
See `.env.example` for full configuration options

### Deployment Commands
```bash
# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run db:migrate
```

## 📚 Documentation

### For Developers
- API documentation: `/docs/api.md`
- Database schema: `/docs/database.md`
- Architecture guide: `/docs/architecture.md`
- Contributing guide: `/CONTRIBUTING.md`

### For Business
- Feature overview: `/docs/features.md`
- Pricing guide: `/docs/pricing.md`
- White-label guide: `/docs/white-label.md`

## 🤝 Support & Community

- **Documentation**: Comprehensive guides included
- **Support**: Built-in support ticket system
- **Monitoring**: Real-time system health dashboard
- **Updates**: Regular security and feature updates

## 📄 License

This is a commercial B2B SaaS platform. All rights reserved.

---

**Ready for Acquisition** - This platform is fully operational with paying customers and comprehensive administrative tools. Perfect for companies looking to enter the corporate travel management market or expand their B2B SaaS portfolio.

Built with ❤️ by the Remvana team