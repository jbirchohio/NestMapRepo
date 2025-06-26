import { Module, Global } from '@nestjs/common';
import { ErrorService } from './services/error.service.js';
import { BookingService } from './services/booking.service.js';
import { BookingController } from './controllers/booking.controller.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
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
export class CommonModule {
}
