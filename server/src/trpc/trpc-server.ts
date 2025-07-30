import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import type { Router } from '@trpc/server';
import type { Express } from 'express';

export function setupTrpc(app: Express) {
  // Add tRPC middleware
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`tRPC Error on ${path}:`, error);
      },
    })
  );

  // Add health check endpoint at /health
  app.get('/health', (_, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  });

  console.log('tRPC server configured at /trpc');
}

export type AppRouter = typeof appRouter;
