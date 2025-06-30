import 'dotenv/config';
import express, { type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import http from 'http';
import type { Server, AddressInfo } from 'net';
import { logger } from './utils/logger.js';
// Import SecureAuth middleware as JWT source of truth
import { authenticate } from './middleware/secureAuth.js';

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Basic middleware with proper type handling
app.use((req: Request, res: Response, next: NextFunction) => {
    return express.json({ limit: '10mb' })(req as any, res as any, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
    return express.urlencoded({ extended: true })(req as any, res as any, next);
});

// CORS middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
});

// Protected route example using SecureAuth
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
    res.json({
        success: true,
        user: (req as any).user, // Type assertion since we know authenticate middleware adds user
        message: 'Authenticated successfully via SecureAuth'
    });
});

// Basic API routes
app.get('/api/test', (_req: Request, res: Response) => {
    res.json({
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});
// Create HTTP server
const server: Server = http.createServer(app);

// Start server
server.listen(PORT, HOST, () => {
    const address = server.address();
    let host: string;
    
    if (typeof address === 'string') {
        host = address;
    } else if (address) {
        host = `${address.address === '::' ? 'localhost' : address.address}:${address.port}`;
    } else {
        host = `${HOST}:${PORT}`;
    }
    
    logger.info(`Server running on ${host}`);
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Health check: http://${host}/health`);
    logger.info('Using SecureAuth as JWT authentication source of truth');
});

// Graceful shutdown
const shutdown = (signal: string) => {
    logger.info(`${signal} signal received: closing HTTP server`);
    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
        }
        logger.info('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export the Express app for testing and programmatic use
export { app };

// For backward compatibility
export default app;
