/**
 * Security Configuration
 * Centralized security settings for the application
 */

export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    passwordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'nestmap-api',
    audience: process.env.JWT_AUDIENCE || 'nestmap-users'
  },

  // Rate Limiting Configuration
  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // limit each IP to 20 auth requests per windowMs
      message: 'Too many authentication attempts, please try again later.'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // limit each IP to 500 API requests per windowMs
      message: 'API rate limit exceeded, please try again later.'
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://nestmap.app',
      'https://app.nestmap.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Organization-ID'
    ]
  },

  // Helmet Security Headers Configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // unsafe-eval needed for some dev tools
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.duffel.com", "wss:", "ws:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"]
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    crossOriginOpenerPolicy: { policy: "same-origin" as const },
    crossOriginResourcePolicy: { policy: "cross-origin" as const },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' as const },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" as const },
    xssFilter: true
  },

  // Password Security
  password: {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128
  },

  // Session Security (for future use)
  session: {
    name: 'nestmap.sid',
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const
    }
  },

  // Input Validation
  validation: {
    maxRequestSize: '10mb',
    maxFieldSize: '1mb',
    maxFiles: 10,
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/json'
    ]
  },

  // Organization Security
  organization: {
    enforceIsolation: true,
    allowCrossOrgAccess: false,
    requireOrgHeader: true,
    maxOrgsPerUser: 10
  },

  // API Security
  api: {
    requireApiKey: false, // Set to true if API keys are implemented
    maxRequestsPerMinute: 100,
    enableRequestLogging: true,
    logSensitiveData: false
  },

  // Database Security
  database: {
    enableQueryLogging: process.env.NODE_ENV === 'development',
    preventSQLInjection: true,
    maxQueryTime: 30000, // 30 seconds
    maxConnections: 100
  }
};

export default securityConfig;

