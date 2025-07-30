import { router, publicProcedure } from './_base.router';

// Define output types
type HealthResponse = {
  status: 'healthy';
  timestamp: string;
  env: string;
  nodeVersion: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  build: string;
  commit: string;
  version: string;
};

// Simple health check endpoint
export const healthRouter = router({
  status: publicProcedure.query((): HealthResponse => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    build: process.env.BUILD_NUMBER || 'local',
    commit: process.env.COMMIT_HASH || 'unknown',
    version: '1.0.0',
  }))
});
