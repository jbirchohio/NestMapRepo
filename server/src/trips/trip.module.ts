import { Module } from '@nestjs/common';
import { TripController } from './controllers/trip.controller';
import { TripServiceProvider } from './trip.container';

@Module({
  controllers: [TripController],
  providers: [TripServiceProvider],
})
export class TripModule {}
