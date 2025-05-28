# NestMap - Enterprise Travel Management Platform

A comprehensive AI-powered travel planning platform designed for businesses, teams, and enterprise organizations. Built with modern web technologies, enterprise-grade security, and scalable B2B architecture.

## 🏢 Enterprise Features

### 🔐 Role-Based Access Control (RBAC)
- **Granular Permissions**: 7+ permission types covering trips, teams, and business features
- **Smart Role Defaults**: Admin, Manager, and User roles with intelligent permission inheritance
- **Organization-Level Security**: Complete data isolation between organizations
- **Permission Management**: Easy-to-use toggle controls for custom permission sets

### 👥 Team Management & Collaboration
- **Professional Team Invitations**: Branded email invitations with organization context
- **Real-time Collaboration**: Share trips and manage team permissions
- **Organization-Aware Workflows**: All features respect organizational boundaries
- **Member Status Tracking**: Monitor team engagement and activity

### 💳 Subscription & Billing Management
- **Stripe Integration**: Complete payment processing and subscription management
- **Three-Tier Pricing**: Free, Team ($29/month), Enterprise ($99/month)
- **Billing Portal**: Self-service payment method and invoice management
- **Upgrade/Downgrade**: Seamless plan transitions with prorated billing

### 📊 Business Analytics & Reporting
- **Permission-Protected Dashboard**: Analytics access based on user roles
- **Enterprise Metrics**: Trip completion rates, user engagement, team performance
- **CSV Export**: Business reporting and data analysis capabilities
- **Growth Tracking**: User acquisition and retention analytics

### 📧 Professional Communications
- **SendGrid Integration**: Branded email templates for all communications
- **Team Invitations**: Professional onboarding emails with company branding
- **Welcome Sequences**: Automated user onboarding for new team members
- **Notification System**: Customizable alerts and updates

## 🌟 Core Travel Features

### AI-Powered Planning
- **OpenAI Integration**: Intelligent trip suggestions and optimization
- **Smart Recommendations**: Context-aware suggestions for activities, dining, and accommodations
- **Itinerary Optimization**: AI-driven schedule optimization to minimize conflicts
- **Weather Integration**: Weather-based activity recommendations

### Advanced Trip Management
- **Interactive Maps**: Mapbox integration with visual trip planning
- **Calendar Sync**: Google Calendar and Outlook integration
- **PDF Export**: Professional trip documentation and sharing
- **Trip Templates**: Pre-built itineraries for common business travel destinations
- **Budget Tracking**: Comprehensive expense planning and tracking

### Mobile & Accessibility
- **Mobile-First Design**: Responsive across all devices and screen sizes
- **Offline Capabilities**: Core functionality works without internet connection
- **Progressive Web App**: App-like experience on mobile devices

## 🚀 Quick Start for Buyers

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Stripe account (for billing features)
- SendGrid account (for email features)

### 1. Environment Setup
```bash
# Clone and install
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables
```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (Required - Supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Maps & Location (Required)
VITE_MAPBOX_TOKEN=pk.your_mapbox_token
MAPBOX_TOKEN=pk.your_mapbox_token
OPENWEATHERMAP_API_KEY=your_weather_api_key

# AI Features (Required)
OPENAI_API_KEY=sk-your_openai_api_key

# Email System (Production Required)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# Billing System (Production Required)
STRIPE_SECRET_KEY=sk_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_your_stripe_public_key
STRIPE_TEAM_PRICE_ID=price_your_team_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

### 3. Stripe Setup (Essential for Billing)

#### Create Stripe Products
1. **Go to Stripe Dashboard** → Products
2. **Create Team Plan**:
   - Name: "NestMap Team"
   - Price: $29/month (recurring)
   - Copy the Price ID to `STRIPE_TEAM_PRICE_ID`
3. **Create Enterprise Plan**:
   - Name: "NestMap Enterprise" 
   - Price: $99/month (recurring)
   - Copy the Price ID to `STRIPE_ENTERPRISE_PRICE_ID`

#### Configure Webhooks (Optional but Recommended)
1. **Go to Stripe Dashboard** → Webhooks
2. **Add endpoint**: `https://yourdomain.com/api/stripe/webhook`
3. **Select events**: 
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. SendGrid Email Setup

#### Domain Authentication
1. **Go to SendGrid** → Settings → Sender Authentication
2. **Authenticate Domain**: Add your domain for professional emails
3. **Set FROM_EMAIL**: Use your authenticated domain (e.g., `noreply@yourdomain.com`)

#### Email Templates (Optional)
- The system includes built-in professional templates
- Customize templates in `server/emailService.ts` if needed

### 5. Database Migration
```bash
# Apply database schema
npm run db:push

# Verify database connection
npm run db:studio
```

### 6. Launch Application
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## 💼 Business Value Proposition

### For Enterprise Buyers
- **Reduce Travel Planning Time**: 70% faster trip planning with AI assistance
- **Improve Team Collaboration**: Real-time sharing and approval workflows
- **Centralized Management**: Single dashboard for all organizational travel
- **Cost Control**: Budget tracking and approval processes
- **Compliance Ready**: Role-based access and audit trails

### Revenue Potential
- **Recurring Revenue**: $29-$99/month per organization
- **Enterprise Contracts**: Custom pricing for large organizations
- **User Scaling**: Revenue grows with team size
- **API Monetization**: Additional revenue from integrations

### Competitive Advantages
- **AI-First Approach**: Superior recommendations vs traditional tools
- **Mobile Excellence**: Best-in-class mobile experience
- **Enterprise Security**: RBAC and organization isolation
- **Integration Ecosystem**: Connects with existing business tools

## 🏗 Technical Architecture

### Frontend Stack
- **React 18** + **TypeScript**: Modern, type-safe development
- **Tailwind CSS** + **shadcn/ui**: Professional, consistent design system
- **React Query**: Optimized data fetching and caching
- **Wouter**: Lightweight, fast routing

### Backend Stack
- **Express.js** + **TypeScript**: Scalable API architecture
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Enterprise-grade database with ACID compliance
- **JWT Authentication**: Secure, stateless authentication

### Enterprise Integrations
- **Stripe**: Payment processing and subscription management
- **SendGrid**: Transactional email delivery
- **Supabase**: Authentication and user management
- **OpenAI**: AI-powered features and recommendations
- **Mapbox**: Maps and location services

### Security & Compliance
- **Role-Based Access Control (RBAC)**: Granular permission system
- **Organization Isolation**: Complete data separation
- **Encrypted Data**: All sensitive data encrypted at rest and in transit
- **Audit Trails**: Complete activity logging for compliance

## 📈 Scaling & Performance

### Database Optimization
- **Indexing Strategy**: Optimized queries for multi-tenant architecture
- **Connection Pooling**: Efficient database connection management
- **Read Replicas**: Scale read operations for analytics

### Caching Layer
- **React Query**: Frontend caching and synchronization
- **API Response Caching**: Reduced server load and faster responses
- **Static Asset CDN**: Global content delivery

### Monitoring & Analytics
- **Error Tracking**: Comprehensive error monitoring and alerting
- **Performance Metrics**: Real-time application performance monitoring
- **Business Metrics**: User engagement and revenue tracking

## 🚀 Deployment Options

### Railway (Recommended for Quick Start)
```bash
# One-click deployment with PostgreSQL included
railway up
```

### Docker Deployment
```dockerfile
# Included Dockerfile for containerized deployment
docker build -t nestmap .
docker run -p 5000:5000 nestmap
```

### Enterprise Cloud Deployment
- **AWS**: ECS/EKS with RDS PostgreSQL
- **Google Cloud**: Cloud Run with Cloud SQL
- **Azure**: Container Instances with Azure Database

## 💰 Monetization Strategy

### Subscription Tiers
1. **Free Tier**: 
   - Up to 5 trips
   - Basic collaboration
   - Mobile access
   
2. **Team ($29/month)**:
   - Unlimited trips
   - Advanced collaboration
   - Analytics dashboard
   - Priority support
   
3. **Enterprise ($99/month)**:
   - Everything in Team
   - Advanced security (RBAC)
   - Custom integrations
   - Dedicated support
   - SLA guarantees

### Enterprise Sales
- **Custom Pricing**: For organizations 100+ users
- **White-Label Options**: Branded solutions for travel agencies
- **API Access**: Partner integrations and marketplace

## 📞 Buyer Support

### Technical Documentation
- **API Documentation**: Complete REST API reference
- **Integration Guides**: Step-by-step setup for all services
- **Troubleshooting**: Common issues and solutions

### Business Support
- **Implementation Assistance**: Help with initial setup and configuration
- **Training Materials**: User guides and admin documentation
- **Custom Development**: Additional features and integrations

### Ongoing Maintenance
- **Security Updates**: Regular security patches and updates
- **Feature Development**: Continuous improvement and new features
- **Performance Optimization**: Ongoing performance monitoring and optimization

---

**Ready to transform your organization's travel planning?** This enterprise-grade platform combines the power of AI with professional-grade features that scale with your business needs.

**Contact Information**: Perfect for immediate deployment or customization to your specific business requirements.