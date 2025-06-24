import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './database.health';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([]), // Add any entities if needed
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
  ],
  exports: [HealthService, DatabaseHealthIndicator],
})
export class HealthModule {}
