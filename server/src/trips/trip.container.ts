import { Provider } from '@nestjs/common';
import { TripServiceImpl } from './services/trip.service';

// Define the provider using standard NestJS pattern
export const TripServiceProvider: Provider = {
  provide: 'TripService',
  useClass: TripServiceImpl,
};
