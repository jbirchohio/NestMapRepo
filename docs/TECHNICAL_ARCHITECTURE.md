# NestMap Technical Architecture
## Deep Dive into System Design and Implementation

---

## System Overview

NestMap is built as a modern, scalable, enterprise-grade travel management platform utilizing a microservices-inspired architecture with a focus on performance, security, and maintainability.

### Architecture Principles
- **API-First Design**: RESTful APIs with comprehensive OpenAPI documentation
- **Type Safety**: End-to-end TypeScript implementation
- **Reactive Programming**: Real-time updates using WebSockets and Server-Sent Events
- **Microservices Ready**: Modular design for easy service extraction
- **Cloud Native**: Containerized deployment with horizontal scaling capabilities

---

## Technology Stack Deep Dive

### Frontend Architecture

#### React 18 with Concurrent Features
```typescript
// Utilizing React 18 concurrent features for optimal performance
import { Suspense, lazy, startTransition } from 'react';

// Code splitting with lazy loading
const AnalyticsPage = lazy(() => import('./pages/Analytics'));

// Concurrent rendering for better UX
function App() {
  const [filter, setFilter] = useState('');
  
  const handleFilterChange = (newFilter: string) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  };
  
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AnalyticsPage filter={filter} />
    </Suspense>
  );
}
```

#### State Management Strategy
```typescript
// React Query for server state management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Intelligent caching and synchronization
export function useTrips(organizationId?: number) {
  return useQuery({
    queryKey: ['trips', organizationId],
    queryFn: () => fetchTrips(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Optimistic updates for better UX
export function useCreateTrip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTrip,
    onMutate: async (newTrip) => {
      await queryClient.cancelQueries({ queryKey: ['trips'] });
      const previousTrips = queryClient.getQueryData(['trips']);
      
      queryClient.setQueryData(['trips'], (old: Trip[]) => [
        ...old,
        { ...newTrip, id: `temp-${Date.now()}` }
      ]);
      
      return { previousTrips };
    },
    onError: (err, newTrip, context) => {
      queryClient.setQueryData(['trips'], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
```

#### Component Architecture
```typescript
// Compound component pattern for flexibility
interface TripCardProps {
  trip: Trip;
  children?: React.ReactNode;
}

export function TripCard({ trip, children }: TripCardProps) {
  return (
    <div className="trip-card">
      <TripCard.Header trip={trip} />
      <TripCard.Body trip={trip} />
      {children}
      <TripCard.Footer trip={trip} />
    </div>
  );
}

TripCard.Header = ({ trip }: { trip: Trip }) => (
  <div className="trip-card-header">
    <h3>{trip.title}</h3>
    <StatusBadge status={trip.status} />
  </div>
);

TripCard.Body = ({ trip }: { trip: Trip }) => (
  <div className="trip-card-body">
    <DateRange start={trip.startDate} end={trip.endDate} />
    <Location city={trip.city} country={trip.country} />
    <Budget amount={trip.budget} currency={trip.currency} />
  </div>
);

TripCard.Footer = ({ trip }: { trip: Trip }) => (
  <div className="trip-card-footer">
    <ActionButton variant="primary">View Details</ActionButton>
    <ActionButton variant="secondary">Edit</ActionButton>
  </div>
);
```

### Backend Architecture

#### Express.js with TypeScript
```typescript
// Modular route organization
import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateSchema } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Type-safe route handlers
router.post('/trips', 
  requireAuth,
  validateSchema(insertTripSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const trip = await tripService.createTrip({
      ...req.body,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });
    
    res.status(201).json(trip);
  })
);

// Error handling middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues
    });
  }
  
  if (err instanceof DatabaseError) {
    return res.status(500).json({
      error: 'Database operation failed',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
};
```

#### Database Layer with Drizzle ORM
```typescript
// Type-safe database operations
import { db } from '../db/connection';
import { trips, users, organizations } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export class TripService {
  async createTrip(data: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(data)
      .returning();
    
    return trip;
  }
  
  async getTripsByOrganization(organizationId: number): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.organizationId, organizationId))
      .orderBy(desc(trips.createdAt));
  }
  
  async getTripWithCollaborators(tripId: number): Promise<TripWithCollaborators | null> {
    const result = await db
      .select({
        trip: trips,
        collaborator: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(trips)
      .leftJoin(users, sql`${users.id} = ANY(${trips.collaborators})`)
      .where(eq(trips.id, tripId));
    
    if (!result.length) return null;
    
    const trip = result[0].trip;
    const collaborators = result
      .filter(r => r.collaborator.id)
      .map(r => r.collaborator);
    
    return { ...trip, collaborators };
  }
}
```

#### Advanced Middleware Implementation
```typescript
// Authentication middleware with JWT
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
    organizationId: number;
    role: string;
  };
}

export const requireAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await userService.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    (req as AuthenticatedRequest).user = {
      id: user.id,
      username: user.username,
      organizationId: user.organizationId,
      role: user.role
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting middleware
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: options.windowMs,
  max: options.max,
  message: options.message || 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Usage: Protect API endpoints
app.use('/api/bookings', createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

---

## Data Flow Architecture

### Request/Response Cycle
```
Client Request → 
  Load Balancer → 
    Express Server → 
      Authentication Middleware → 
        Validation Middleware → 
          Rate Limiting → 
            Business Logic → 
              Database Query → 
                Response Transformation → 
                  Client Response
```

### Real-Time Data Flow
```typescript
// WebSocket implementation for real-time updates
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

export class RealtimeService {
  private io: SocketIOServer;
  
  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      }
    });
    
    // Redis adapter for horizontal scaling
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await this.validateToken(token);
        socket.user = user;
        socket.join(`org:${user.organizationId}`);
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
    
    this.io.on('connection', (socket) => {
      socket.on('join:trip', (tripId) => {
        socket.join(`trip:${tripId}`);
      });
      
      socket.on('trip:update', async (data) => {
        // Validate user can edit trip
        const canEdit = await this.validateTripAccess(socket.user.id, data.tripId);
        if (!canEdit) return;
        
        // Update trip in database
        await tripService.updateTrip(data.tripId, data.updates);
        
        // Broadcast to all trip collaborators
        socket.to(`trip:${data.tripId}`).emit('trip:updated', data);
      });
    });
  }
  
  // Emit events from business logic
  async notifyTripUpdate(tripId: number, update: any) {
    this.io.to(`trip:${tripId}`).emit('trip:updated', update);
  }
  
  async notifyBookingConfirmation(userId: number, booking: any) {
    this.io.to(`user:${userId}`).emit('booking:confirmed', booking);
  }
}
```

---

## Security Architecture

### Authentication & Authorization
```typescript
// JWT token management
export class AuthService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  
  async generateTokenPair(userId: number) {
    const payload = { userId, type: 'access' };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.accessTokenExpiry
    });
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' }, 
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: this.refreshTokenExpiry }
    );
    
    // Store refresh token hash in database
    await this.storeRefreshToken(userId, refreshToken);
    
    return { accessToken, refreshToken };
  }
  
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Verify refresh token exists in database
      const isValid = await this.validateRefreshToken(decoded.userId, refreshToken);
      if (!isValid) throw new Error('Invalid refresh token');
      
      // Generate new access token
      const { accessToken } = await this.generateTokenPair(decoded.userId);
      return accessToken;
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }
}

// Role-based access control
export class PermissionService {
  private readonly permissions = {
    'admin': ['*'], // All permissions
    'manager': [
      'trips:read', 'trips:write', 'trips:delete',
      'bookings:read', 'bookings:write',
      'analytics:read', 'analytics:write',
      'users:read', 'cards:read'
    ],
    'user': [
      'trips:read', 'trips:write',
      'bookings:read', 'bookings:write',
      'analytics:read:own'
    ]
  };
  
  hasPermission(userRole: string, permission: string): boolean {
    const userPermissions = this.permissions[userRole] || [];
    
    // Admin has all permissions
    if (userPermissions.includes('*')) return true;
    
    // Check exact permission
    if (userPermissions.includes(permission)) return true;
    
    // Check wildcard permissions
    const permissionParts = permission.split(':');
    for (let i = permissionParts.length - 1; i > 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i).join(':') + ':*';
      if (userPermissions.includes(wildcardPermission)) return true;
    }
    
    return false;
  }
}

// Security middleware
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!permissionService.hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### Data Encryption & Privacy
```typescript
// Sensitive data encryption
import crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  
  encrypt(text: string, key?: string): string {
    const encryptionKey = key ? Buffer.from(key, 'hex') : this.getSystemKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('nestmap', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedData: string, key?: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const encryptionKey = key ? Buffer.from(key, 'hex') : this.getSystemKey();
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('nestmap', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  private getSystemKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY not configured');
    return Buffer.from(key, 'hex');
  }
}

// PII data protection
export class PIIProtectionService {
  private static readonly sensitiveFields = [
    'ssn', 'passport', 'creditCard', 'bankAccount'
  ];
  
  static sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = { ...data };
    
    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskValue(sanitized[field]);
      }
    }
    
    return sanitized;
  }
  
  private static maskValue(value: string): string {
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
  }
}
```

---

## Performance Optimization

### Caching Strategy
```typescript
// Multi-layer caching implementation
export class CacheService {
  private redis: Redis;
  private memoryCache: Map<string, { value: any; expiry: number }>;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.memoryCache = new Map();
    
    // Clean up expired memory cache entries
    setInterval(() => this.cleanMemoryCache(), 60000);
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first (L1)
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) return memoryResult;
    
    // Check Redis cache (L2)
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      // Populate memory cache
      this.setInMemory(key, parsed, 60); // 1 minute memory cache
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // Set in Redis (L2)
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    
    // Set in memory (L1) with shorter TTL
    const memoryTtl = Math.min(ttlSeconds, 60);
    this.setInMemory(key, value, memoryTtl);
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Invalidate Redis cache
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Database query optimization
export class QueryOptimizer {
  // Connection pooling
  static createPool() {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      min: 10,
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  
  // Query result caching
  static async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await cacheService.get<T>(cacheKey);
    if (cached) return cached;
    
    const result = await queryFn();
    await cacheService.set(cacheKey, result, ttlSeconds);
    
    return result;
  }
  
  // Batch loading for N+1 prevention
  static createDataLoader<K, V>(
    batchLoadFn: (keys: K[]) => Promise<V[]>
  ) {
    return new DataLoader(batchLoadFn, {
      cache: true,
      maxBatchSize: 100
    });
  }
}
```

### Database Performance
```typescript
// Advanced indexing strategy
export const databaseIndexes = {
  // Composite indexes for common queries
  trips_org_date: 'CREATE INDEX CONCURRENTLY idx_trips_org_date ON trips(organization_id, start_date)',
  
  // Partial indexes for filtered queries
  active_bookings: 'CREATE INDEX CONCURRENTLY idx_active_bookings ON bookings(trip_id) WHERE status = \'confirmed\'',
  
  // Functional indexes for computed columns
  trip_duration: 'CREATE INDEX CONCURRENTLY idx_trip_duration ON trips((end_date - start_date))',
  
  // Text search indexes
  trip_search: 'CREATE INDEX CONCURRENTLY idx_trip_search ON trips USING gin(to_tsvector(\'english\', title || \' \' || city || \' \' || country))'
};

// Query optimization utilities
export class DatabaseOptimizer {
  // Explain analyze for query performance
  static async analyzeQuery(query: string, params: any[]) {
    const result = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS) ${sql.raw(query)}`, params);
    console.log('Query Plan:', result);
    return result;
  }
  
  // Automatic query plan caching
  static async prepareStatement(name: string, query: string) {
    await db.execute(sql`PREPARE ${sql.raw(name)} AS ${sql.raw(query)}`);
  }
  
  // Connection health monitoring
  static async checkConnectionHealth() {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    
    if (latency > 100) {
      logger.warn(`High database latency: ${latency}ms`);
    }
    
    return { healthy: true, latency };
  }
}
```

---

## Monitoring & Observability

### Application Performance Monitoring
```typescript
// Custom APM implementation
export class APMService {
  private metrics: Map<string, number[]> = new Map();
  
  // Request timing middleware
  static requestTimer() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();
      
      res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        
        apmService.recordMetric('http_request_duration', duration, {
          method: req.method,
          route: req.route?.path || req.path,
          status: res.statusCode.toString()
        });
        
        // Log slow requests
        if (duration > 1000) {
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration: `${duration.toFixed(2)}ms`,
            statusCode: res.statusCode
          });
        }
      });
      
      next();
    };
  }
  
  recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(value);
    
    // Keep only last 1000 measurements
    const values = this.metrics.get(key)!;
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
  }
  
  getMetricSummary(name: string, tags: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    const values = this.metrics.get(key) || [];
    
    if (values.length === 0) return null;
    
    values.sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }
}

// Health check endpoints
export class HealthCheckService {
  static async performHealthCheck() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      external_apis: await this.checkExternalAPIs(),
      disk_space: await this.checkDiskSpace(),
      memory: this.checkMemoryUsage()
    };
    
    const isHealthy = Object.values(checks).every(check => check.healthy);
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    };
  }
  
  private static async checkDatabase() {
    try {
      const result = await DatabaseOptimizer.checkConnectionHealth();
      return {
        healthy: true,
        latency: result.latency,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Database connection failed'
      };
    }
  }
  
  private static checkMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.rss / 1024 / 1024);
    const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    return {
      healthy: totalMB < 1024, // Alert if over 1GB
      total: `${totalMB}MB`,
      heap: `${heapMB}MB`,
      message: `Memory usage: ${totalMB}MB total, ${heapMB}MB heap`
    };
  }
}
```

### Error Tracking & Alerting
```typescript
// Comprehensive error tracking
export class ErrorTrackingService {
  private errorCounts: Map<string, number> = new Map();
  
  static captureError(error: Error, context: any = {}) {
    const errorKey = `${error.name}:${error.message}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // Enhanced error logging
    logger.error('Application error captured', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: PIIProtectionService.sanitizeForLogging(context),
      count: currentCount + 1,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
    
    // Alert on repeated errors
    if (currentCount > 10) {
      this.sendAlert(`High error frequency: ${errorKey}`, {
        count: currentCount,
        error: error.message
      });
    }
  }
  
  private static async sendAlert(message: string, data: any) {
    // Integration with alerting services (Slack, PagerDuty, etc.)
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 NestMap Alert: ${message}`,
          attachments: [{
            color: 'danger',
            fields: Object.entries(data).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            }))
          }]
        })
      });
    } catch (error) {
      logger.error('Failed to send alert', error);
    }
  }
}
```

---

## Testing Strategy

### Unit Testing
```typescript
// Comprehensive test utilities
export class TestUtils {
  static createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      username: 'test@example.com',
      organizationId: 1,
      role: 'user',
      firstName: 'Test',
      lastName: 'User',
      ...overrides
    };
  }
  
  static createMockTrip(overrides: Partial<Trip> = {}): Trip {
    return {
      id: 1,
      title: 'Test Trip',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      userId: 1,
      organizationId: 1,
      city: 'San Francisco',
      country: 'United States',
      ...overrides
    };
  }
  
  static async setupTestDatabase() {
    // Create test database schema
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS test`);
    await db.execute(sql`SET search_path TO test`);
    
    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });
  }
  
  static async cleanupTestDatabase() {
    await db.execute(sql`DROP SCHEMA test CASCADE`);
  }
}

// Service layer testing
describe('TripService', () => {
  let tripService: TripService;
  let mockUser: User;
  
  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
    tripService = new TripService();
    mockUser = TestUtils.createMockUser();
  });
  
  afterEach(async () => {
    await TestUtils.cleanupTestDatabase();
  });
  
  describe('createTrip', () => {
    it('should create trip with valid data', async () => {
      const tripData = {
        title: 'Business Conference',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        userId: mockUser.id,
        organizationId: mockUser.organizationId
      };
      
      const trip = await tripService.createTrip(tripData);
      
      expect(trip).toMatchObject({
        title: tripData.title,
        startDate: tripData.startDate,
        endDate: tripData.endDate
      });
      expect(trip.id).toBeDefined();
    });
    
    it('should validate date constraints', async () => {
      const invalidTripData = {
        title: 'Invalid Trip',
        startDate: new Date('2024-12-03'),
        endDate: new Date('2024-12-01'), // End before start
        userId: mockUser.id,
        organizationId: mockUser.organizationId
      };
      
      await expect(tripService.createTrip(invalidTripData))
        .rejects.toThrow('End date must be after start date');
    });
  });
});
```

### Integration Testing
```typescript
// API endpoint testing
describe('Trip API', () => {
  let app: Express;
  let authToken: string;
  
  beforeAll(async () => {
    app = createTestApp();
    authToken = await getTestAuthToken();
  });
  
  describe('POST /api/trips', () => {
    it('should create trip with authentication', async () => {
      const tripData = {
        title: 'API Test Trip',
        startDate: '2024-12-01',
        endDate: '2024-12-03',
        city: 'New York',
        country: 'United States'
      };
      
      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        title: tripData.title,
        city: tripData.city,
        country: tripData.country
      });
    });
    
    it('should reject unauthorized requests', async () => {
      await request(app)
        .post('/api/trips')
        .send({})
        .expect(401);
    });
  });
});

// End-to-end testing with Playwright
describe('Trip Management E2E', () => {
  let page: Page;
  
  beforeEach(async () => {
    page = await browser.newPage();
    await login(page, 'test@example.com', 'password');
  });
  
  it('should allow creating and editing trips', async () => {
    // Navigate to trips page
    await page.click('[data-testid="nav-trips"]');
    await expect(page.locator('h1')).toContainText('My Trips');
    
    // Create new trip
    await page.click('[data-testid="create-trip"]');
    await page.fill('[data-testid="trip-title"]', 'E2E Test Trip');
    await page.fill('[data-testid="trip-destination"]', 'London');
    await page.click('[data-testid="save-trip"]');
    
    // Verify trip was created
    await expect(page.locator('[data-testid="trip-card"]')).toContainText('E2E Test Trip');
    
    // Edit trip
    await page.click('[data-testid="edit-trip"]');
    await page.fill('[data-testid="trip-title"]', 'Updated Trip Title');
    await page.click('[data-testid="save-trip"]');
    
    // Verify trip was updated
    await expect(page.locator('[data-testid="trip-card"]')).toContainText('Updated Trip Title');
  });
});
```

---

This technical architecture documentation provides a comprehensive overview of NestMap's implementation details, covering everything from component design to testing strategies. The platform is built with enterprise-grade considerations including security, performance, monitoring, and maintainability.
