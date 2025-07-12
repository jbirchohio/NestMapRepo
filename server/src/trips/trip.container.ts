import { Provider } from '@nestjs/common.js';
import { NestFactory } from '@nestjs/core.js';
import { TripModule } from './trip.module.js';
import { TripController } from './controllers/trip.controller.js';
import { TripServiceImpl } from './services/trip.service.js';
// Import repository provider from common repositories
import { TripRepositoryProvider } from '../common/repositories/repository.providers.js';

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
