import express from 'express';
import session from 'express-session';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: `${__dirname}/.env` });

// Types
type UserRole = 'admin' | 'member' | 'guest';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  permissions: string[];
}

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string | null;
      requestId: string;
    }
  }
}

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db',
});

// Session configuration
const PgSession = (await import('connect-pg-simple')).default(session);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PgSession({
    pool,
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
}));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  next();
});

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session || !(req.session as any).user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = (req.session as any).user;
  next();
};

// Role-based access control
const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = mockUsers[email as keyof typeof mockUsers];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // In a real app, verify password hash
  if (password !== 'password') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Set up session
  (req.session as any).user = user;
  
  res.json({
    user,
    sessionId: req.sessionID,
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session?.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Protected routes
app.get('/api/protected', authenticate, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
  });
});

app.get('/api/admin', authenticate, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Admin dashboard',
    user: req.user,
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[${req.requestId}] Error:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: req.requestId,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
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

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down test server...');
  server.close(() => {
    console.log('Test server stopped');
    pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
