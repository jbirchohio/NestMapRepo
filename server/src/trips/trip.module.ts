import { Module } from '@nestjs/common.js';
import { TripController } from './controllers/trip.controller.js';
import { TripServiceProvider } from './trip.container.js';
import { RepositoriesModule } from '../common/repositories.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [TripController],
  providers: [TripServiceProvider],
})
export class TripModule {}
