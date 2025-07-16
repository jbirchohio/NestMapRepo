import { Module } from '@nestjs/common';
import { TripController } from './controllers/trip.controller';
import { TripTemplatesController } from './controllers/trip-templates.controller';
import { TripServiceProvider } from './trip.container';
import { RepositoriesModule } from '../common/repositories';

@Module({
  imports: [RepositoriesModule],
  controllers: [TripController, TripTemplatesController],
  providers: [TripServiceProvider],
})
export class TripModule {}
