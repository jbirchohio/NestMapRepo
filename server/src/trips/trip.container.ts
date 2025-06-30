import type { Provider } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TripModule } from './trip.module.js';
import { TripController } from './controllers/trip.controller.js';
import { TripServiceImpl } from './services/trip.service.js';
import { PrismaClient } from '@prisma/client';
import { PrismaTripRepository } from './repositories/prisma-trip.repository.js';

// Create a Prisma client instance
const prisma = new PrismaClient();

// Create repository instance
const tripRepository = new PrismaTripRepository(prisma);

export const TripServiceProvider: Provider = {
    provide: 'TripService',
    useFactory: () => new TripServiceImpl(tripRepository),
};

// For backward compatibility
export const TripRepositoryProvider: Provider = {
    provide: 'TripRepository',
    useValue: tripRepository,
};

let tripController: TripController;

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(TripModule);
    tripController = app.get(TripController);
}

// Only bootstrap in development
if (process.env.NODE_ENV === 'development') {
    bootstrap().catch(err => {
        console.error('Failed to bootstrap trip controller:', err);
        process.exit(1);
    });
}

export { tripController };
