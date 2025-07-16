// Standard NestJS imports
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TripModule } from './trips/trip.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TripModule,
  ],
  controllers: [],
  providers: [],
})
class AppModule {}

// Export the AppModule
// This is a workaround for ESM compatibility
export { AppModule };
// Also export as default for compatibility
export default AppModule;
