import { Module } from '@nestjs/common.js';
import { ConfigModule, ConfigService } from '@nestjs/config.js';
import { NodemailerEmailService } from './services/nodemailer-email.service.js.js';
import { ErrorService } from '../common/services/error.service.js.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'EmailService',
      useFactory: (configService: ConfigService, errorService: ErrorService) => {
        return new NodemailerEmailService(configService, errorService);
      },
      inject: [ConfigService, ErrorService],
    },
    ErrorService,
  ],
  exports: ['EmailService'],
})
export class EmailModule {}
