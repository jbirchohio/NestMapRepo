import type { Module } from '@nestjs/common';
import type { TripController } from './controllers/trip.controller.ts';
import type { TripServiceProvider } from './trip.container.ts';
import type { RepositoriesModule } from '../common/repositories/index.ts';
@Module({
    imports: [RepositoriesModule],
    controllers: [TripController],
    providers: [TripServiceProvider],
})
export class TripModule {
}
