import { Module, Global } from '@nestjs/common';
import { ErrorService } from './services/error.service';
import { BookingService } from './services/booking.service';
import { BookingController } from './controllers/booking.controller';
import { RepositoriesModule } from './repositories/repositories.module';

/**
 * Common module providing shared services and utilities
 */
@Global()
@Module({
  imports: [
    RepositoriesModule,
  ],
  controllers: [
    BookingController,
  ],
  providers: [
    ErrorService,
    BookingService,
    {
      provide: 'BookingService',
      useExisting: BookingService,
    },
  ],
  exports: [
    ErrorService,
    BookingService,
    RepositoriesModule,
  ],
})
export class CommonModule {}

