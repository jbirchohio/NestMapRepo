import { Module } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller.js';
import { BookingService } from '../services/booking.service.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';

/**
 * Module for booking feature
 * Demonstrates how to register controllers, services, and repositories in the DI container
 */
@Module({
  imports: [RepositoriesModule],
  controllers: [BookingController],
  providers: [
    {
      provide: 'BookingService',
      useClass: BookingService,
    },
  ],
  exports: ['BookingService'],
})
export class BookingModule {}
