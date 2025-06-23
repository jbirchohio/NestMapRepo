import type { Module } from '@nestjs/common';
import type { ConfigModule, ConfigService } from '@nestjs/config';
import type { NodemailerEmailService } from './services/nodemailer-email.service.js';
import type { ErrorService } from '../common/services/error.service.js';
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
export class EmailModule {
}
