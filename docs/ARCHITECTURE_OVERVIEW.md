# NestMap - Architecture Overview

## 🏗️ **System Architecture**

NestMap is built as a modern, scalable enterprise travel management platform using a monorepo structure with clear separation of concerns.

### **High-Level Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  External APIs  │    │  AI Services    │    │  File Storage   │
│ (Duffel, etc.)  │    │   (OpenAI)      │    │   (Local/S3)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 **Project Structure**

### **Root Directory**
```
NestMapRepo/
├── docs/                    # Documentation (this folder)
├── client/                  # React frontend application
├── server/                  # Express.js backend API
├── shared/                  # Shared TypeScript schemas
├── tests/                   # Test suites and examples
├── scripts/                 # Deployment and utility scripts
├── android/                 # Mobile app (Capacitor)
├── README.md               # Main project documentation
├── package.json            # Root workspace configuration
└── pnpm-workspace.yaml     # PNPM workspace definition
```

### **Frontend (`/client`)**
```
client/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components (shadcn/ui)
│   │   ├── forms/         # Form components
│   │   └── navigation/    # Navigation components
│   ├── pages/             # Route-based page components
│   │   ├── auth/          # Authentication pages
│   │   ├── dashboard/     # Dashboard and analytics
│   │   ├── trips/         # Trip management
│   │   └── voice/         # Voice interface
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React context providers
│   ├── services/          # API clients and utilities
│   ├── utils/             # Helper functions
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
└── package.json          # Frontend dependencies
```

### **Backend (`/server`)**
```
server/
├── routes/               # API route handlers
│   ├── auth.ts          # Authentication endpoints
│   ├── flights.ts       # Flight search and booking
│   ├── organizations.ts # Organization management
│   ├── trips.ts         # Trip CRUD operations
│   └── voice.ts         # Voice interface API
├── services/            # Business logic services
│   ├── voiceInterface.ts      # Voice command processing
│   ├── carbonFootprint.ts     # Carbon tracking
│   ├── advancedAnalytics.ts   # Enterprise analytics
│   └── enterpriseIntegration.ts # HR/Finance integration
├── middleware/          # Express middleware
│   ├── secureAuth.ts    # JWT authentication
│   ├── organizationScoping.ts # Multi-tenant security
│   └── globalErrorHandler.ts # Error handling
├── utils/               # Utility functions
├── logs/                # Application logs
└── package.json         # Backend dependencies
```

### **Shared (`/shared`)**
```
shared/
├── src/
│   ├── schema/          # Database schema definitions
│   │   ├── auth.ts      # User and authentication tables
│   │   ├── organizations.ts # Organization and roles
│   │   ├── trips.ts     # Trip and expense tables
│   │   └── index.ts     # Schema exports
│   └── types/           # Shared TypeScript types
└── package.json         # Shared package configuration
```

## 🔧 **Technology Stack**

### **Frontend Technologies**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: React Context API + React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization
- **Voice**: Web Speech API for voice recognition

### **Backend Technologies**
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based stateless authentication
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston for structured logging
- **File Processing**: Multer for uploads
- **Email**: Nodemailer for notifications

### **Database & Storage**
- **Primary Database**: PostgreSQL (via Supabase or self-hosted)
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for schema management
- **File Storage**: Local filesystem (S3-ready)

### **External Integrations**
- **Flight Data**: Duffel API for authentic airline data
- **AI Services**: OpenAI GPT-4 for voice and recommendations
- **Weather**: OpenWeatherMap API
- **News**: NewsAPI for travel-related updates
- **Maps**: Google Maps API (optional)

## 🔄 **Data Flow**

### **Authentication Flow**
1. User submits credentials to `/api/auth/login`
2. Server validates against database
3. JWT token generated and returned
4. Client stores token and includes in API requests
5. Middleware validates token on protected routes

### **API Request Flow**
1. Client makes API request with JWT token
2. Authentication middleware validates token
3. Organization scoping middleware ensures data isolation
4. Route handler processes business logic
5. Service layer interacts with database/external APIs
6. Response returned with proper error handling

### **Voice Interface Flow**
1. Client captures audio via Web Speech API
2. Audio/text sent to `/api/voice/command`
3. Server processes natural language with OpenAI
4. Intent extracted and appropriate action taken
5. Response generated and returned to client
6. Client plays audio response via Text-to-Speech

## 🏢 **Multi-Tenant Architecture**

### **Organization Isolation**
- Every database record includes `organizationId`
- Middleware automatically scopes queries by organization
- Role-based access control within organizations
- Complete data isolation between tenants

### **Role Hierarchy**
```
super_admin    # Platform administration
    ↓
admin         # Organization owner
    ↓
manager       # Department/team management
    ↓
member        # Standard employee access
    ↓
guest         # Limited read-only access
```

## 🔒 **Security Architecture**

### **Authentication & Authorization**
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Organization-scoped data access
- Secure password hashing with bcrypt

### **API Security**
- Helmet middleware for security headers
- CORS configuration for cross-origin requests
- Rate limiting to prevent abuse
- Input validation with Zod schemas
- SQL injection prevention via ORM

### **Data Protection**
- Environment-based configuration
- Secure secret management
- Audit logging for sensitive operations
- HTTPS enforcement in production

## 📱 **Mobile Architecture**

### **Capacitor Integration**
- Native iOS and Android app generation
- Shared codebase with web application
- Native device API access
- Offline capability support

## 🚀 **Deployment Architecture**

### **Development Environment**
- PNPM workspaces for monorepo management
- Hot reloading for rapid development
- TypeScript compilation with strict mode
- ESLint and Prettier for code quality

### **Production Deployment**
- Docker containerization
- Cloud-native deployment (AWS, GCP, Azure)
- Horizontal scaling with load balancers
- Database connection pooling
- CDN for static asset delivery

## 🔧 **Key Design Decisions**

### **Monorepo Structure**
- **Why**: Shared types and schemas between frontend/backend
- **Benefit**: Type safety across the entire application
- **Tool**: PNPM workspaces for efficient dependency management

### **JWT Authentication**
- **Why**: Stateless, scalable authentication
- **Benefit**: No server-side session storage required
- **Implementation**: Secure token generation with configurable expiration

### **Drizzle ORM**
- **Why**: Type-safe database operations with excellent TypeScript support
- **Benefit**: Compile-time query validation and auto-completion
- **Migration**: Schema-first approach with version control

### **Express.js over NestJS**
- **Why**: Simpler architecture, faster development, lower learning curve
- **Benefit**: Direct control over middleware and routing
- **Performance**: Lighter weight with better performance characteristics

## 📊 **Performance Considerations**

### **Frontend Optimization**
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Bundle size optimization with tree shaking
- Service worker for offline functionality

### **Backend Optimization**
- Database query optimization with proper indexing
- Connection pooling for database efficiency
- Caching strategies for frequently accessed data
- Async/await patterns for non-blocking operations

### **Scalability Features**
- Stateless architecture for horizontal scaling
- Database read replicas support
- CDN integration for global content delivery
- Microservices-ready modular design

---

This architecture provides a solid foundation for enterprise-scale travel management with clear separation of concerns, type safety, and scalability built in from the ground up.
