import type { Module, Global } from '@nestjs/common';
import type { ErrorService } from './services/error.service.ts';
import type { BookingService } from './services/booking.service.ts';
import type { BookingController } from './controllers/booking.controller.ts';
import type { RepositoriesModule } from './repositories/repositories.module.ts';
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
