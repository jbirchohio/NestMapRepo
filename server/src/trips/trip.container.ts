import { Provider } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TripModule } from './trip.module';
import { TripController } from './controllers/trip.controller';
import { TripServiceImpl } from './services/trip.service';
// Import repository provider from common repositories
import { TripRepositoryProvider } from '../common/repositories/repository.providers';

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
