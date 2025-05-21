import { Express, Request, Response } from 'express';

/**
 * Register health check routes that work across all platforms
 * This can be imported into the main routes file
 */
export function registerHealthRoutes(app: Express) {
  // Basic health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Detailed health check with database status
  app.get('/api/health/detailed', async (req: Request, res: Response) => {
    try {
      // Simple check to make sure server is responsive
      const services = {
        api: true,
        database: false
      };
      
      // Check database if db check function is available
      try {
        // We need to import this dynamically since it might not be available
        // in all environments
        const { testConnection } = await import('./db-connection');
        services.database = await testConnection();
      } catch (error) {
        console.error('Database health check failed:', error);
      }
      
      return res.status(services.database ? 200 : 503).json({
        status: services.database ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } catch (error) {
      console.error('Detailed health check failed:', error);
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed'
      });
    }
  });
}