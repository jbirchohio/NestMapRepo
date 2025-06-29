import express, { type Request, type Response, type NextFunction, type Application, type RequestHandler } from 'express';
import session from 'express-session';
import pgSessionFactory from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import types
import type { Session, SessionData } from 'express-session';
import type { CorsOptions } from 'cors';

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser;
  }
}

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize dotenv
config({ path: new URL('../.env', import.meta.url).pathname });

// Log environment variables to debug
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set'
});

// Types
type UserRole = 'admin' | 'member' | 'guest';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  permissions: string[];
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string | null;
      requestId: string;
      session: Session & Partial<SessionData> & {
        user?: AuthUser;
      };
    }
  }
}

// Configuration
const PORT = process.env.TEST_PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

// Initialize Express app
const app: Application = express();

// Database pool for session store
const pgPool = new Pool({
  connectionString: DATABASE_URL,
});

// Session configuration
const PgSession = pgSessionFactory(session);
const sessionConfig = {
  store: new PgSession({
    pool: pgPool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'test-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
  },
};

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  next();
});

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction): Response | void => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = req.session.user;
  next();
};

// Role-based access control middleware
const requireRole = (roles: UserRole | UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Mock user data
const mockUsers: Record<string, AuthUser> = {
  'admin@example.com': {
    id: 'user-admin-123',
    email: 'admin@example.com',
    role: 'admin',
    organizationId: 'org-123',
    permissions: ['read', 'write', 'delete'],
  },
  'member@example.com': {
    id: 'user-member-456',
    email: 'member@example.com',
    role: 'member',
    organizationId: 'org-123',
    permissions: ['read'],
  },
};

// Auth routes
app.post('/api/auth/login', (req: Request, res: Response): Response | void => {
  const { email, password } = req.body;
  
  // In a real app, you would validate credentials against a database
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = mockUsers[email as keyof typeof mockUsers];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // In a real app, you would verify the password hash
  if (password !== 'password') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Set up session
  req.session.user = user;
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    res.json({
      user,
      sessionId: req.sessionID,
    });
  });
});

app.post('/api/auth/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Protected route example
app.get('/api/protected', authenticate, (req: Request, res: Response) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
  });
});

// Admin route example
app.get('/api/admin', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  res.json({
    message: 'Admin dashboard',
    user: req.user,
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
  console.error(`[${req.requestId}] Error:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: req.requestId,
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  POST   http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST   http://localhost:${PORT}/api/auth/logout`);
  console.log(`  GET    http://localhost:${PORT}/api/protected`);
  console.log(`  GET    http://localhost:${PORT}/api/admin`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down test server...');
  server.close(() => {
    console.log('Test server stopped');
    pgPool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// For testing purposes
export { app, server, pgPool };
