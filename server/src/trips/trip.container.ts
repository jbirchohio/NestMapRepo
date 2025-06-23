import type { Provider } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TripModule } from './trip.module.ts';
import { TripController } from './controllers/trip.controller.ts';
import { TripServiceImpl } from './services/trip.service.ts';
// Import repository provider from common repositories
import type { TripRepositoryProvider } from '../common/repositories/repository.providers.ts';
export const TripServiceProvider: Provider = {
    provide: 'TripService',
    useClass: TripServiceImpl,
};
let tripController: TripController;
async function bootstrap() {
    const app = await NestFactory.createApplicationContext(TripModule);
    tripController = app.get(TripController);
}
bootstrap();
export { tripController };
