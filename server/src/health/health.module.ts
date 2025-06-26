import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { DatabaseHealthIndicator } from './database.health.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
  ],
  exports: [HealthService, DatabaseHealthIndicator],
})
export class HealthModule {}
