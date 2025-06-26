import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { NodemailerEmailService } from './services/nodemailer-email.service.js';
import { ErrorService } from '../common/services/error.service.js';
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
