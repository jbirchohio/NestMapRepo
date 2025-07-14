// Local type definitions to avoid external dependencies
interface Request {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[]>;
  path?: string;
  ip?: string;
  method?: string;
  [key: string]: unknown;
}

interface Response {
  status(code: number): Response;
  json(data: Record<string, unknown>): Response;
  send(data: unknown): Response;
  setHeader(name: string, value: string): void;
  getHeader(name: string): string | undefined;
}

interface NextFunction {
  (error?: Error | string | null): void;
}

interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): void;
}

// Mock rate limiting implementation
const rateLimit = (options: {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skip: (req: Request) => boolean;
  handler: (req: Request, res: Response) => void;
}): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (options.skip(req)) {
      return next();
    }
    // Simple rate limiting logic would go here
    // For now, just pass through
    next();
  };
};

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for certain paths or in development
    const skipPaths = ['/health', '/api/health'];
    return process.env.NODE_ENV === 'development' || 
           skipPaths.some(path => req.path?.startsWith(path));
  },
  // Handler for rate limit exceeded
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      status: 429
    });
  }
});

export const rateLimiterMiddleware: RequestHandler = (req, res, next) => {
  // Skip rate limiting for non-authentication endpoints
  // Check if path exists and then verify if it starts with the auth endpoint path
  if (!req.path || !req.path.startsWith('/api/auth')) {
    return next();
  }
  
  // Apply rate limiting for auth endpoints
  return limiter(req, res, next);
};
