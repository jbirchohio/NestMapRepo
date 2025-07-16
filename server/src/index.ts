import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Simple logger for the bootstrap process
const logger = {
  log: (message: string) => console.log(`[${new Date().toISOString()}] ${message}`),
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error || '');
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;

  // Enable CORS for development
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Add global prefix
  app.setGlobalPrefix('api');

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Server is running',
      api: {
        templates: `/api/templates`,
        createTrip: `/api/templates/:templateId/create-trip`
      }
    });
  });

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
  logger.log(`Templates API: http://localhost:${port}/api/templates`);
}

bootstrap().catch(err => {
  console.error('Failed to bootstrap the application', err);
  process.exit(1);
});
