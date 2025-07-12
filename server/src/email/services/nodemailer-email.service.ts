import { Injectable, Logger } from '@nestjs/common.js';
import { ConfigService } from '@nestjs/config.js';
import { createTransport, Transporter } from 'nodemailer.js';
import { readFileSync } from 'fs.js';
import { join, dirname } from 'path.js';
import { fileURLToPath } from 'url.js';
import { ErrorService } from '@shared/common/services/error.service';
import { 
  EmailService, 
  EmailOptions, 
  PasswordResetEmailOptions, 
  PasswordResetConfirmationOptions,
  PaymentReceiptEmailOptions
} from '../interfaces/email.service.interface.js';
import handlebars from 'handlebars.js';
const { compile } = handlebars;
type TemplateDelegate = handlebars.TemplateDelegate;

// Get the current module's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly errorService: ErrorService
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.example.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASSWORD', ''),
      },
    };

    this.transporter = createTransport(smtpConfig);

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Failed to connect to SMTP server', error);
      } else {
        this.logger.log('Connected to SMTP server');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.errorService.throwInternalServerError('Email transporter not initialized');
    }
    
    const { to, subject, template, context = {} } = options;
    const from = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    try {
      const html = await this.renderTemplate(template, context);
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      
      this.logger.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error.js';
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      this.errorService.throwInternalServerError(`Failed to send email: ${errorMessage}`, { recipient: to }, error instanceof Error ? error.stack : undefined);
    }
  }

  async sendPasswordResetEmail(
    email: string, 
    options: PasswordResetEmailOptions
  ): Promise<void> {
    const { name, resetUrl, expiryHours } = options;
    
    const subject = 'Password Reset Request.js';
    const template = 'password-reset.js';
    const context = {
      name,
      resetUrl,
      expiryHours,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@example.com'),
    };

    await this.sendEmail({ to: email, subject, template, context });
  }

  async sendPasswordResetConfirmationEmail(
    email: string, 
    options: PasswordResetConfirmationOptions
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your password has been reset',
      template: 'password-reset-confirmation',
      context: {
        name: options.name
      }
    });
  }

  async sendPaymentReceiptEmail(
    email: string,
    options: PaymentReceiptEmailOptions
  ): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    await this.sendEmail({
      to: email,
      subject: `Payment Receipt - ${options.invoiceNumber}`,
      template: 'payment-receipt',
      context: {
        ...options,
        currentYear,
        // Ensure companyLogo is a full URL if provided
        companyLogo: options.companyLogo?.startsWith('http') 
          ? options.companyLogo 
          : undefined
      }
    });
  }

  private loadTemplate(templateName: string): TemplateDelegate {
    try {
      const templatePath = join(__dirname, '..', 'templates', `${templateName}.hbs`);
      const templateSource = readFileSync(templatePath, 'utf8');
      return compile(templateSource);
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      this.errorService.throwInternalServerError(`Failed to load template: ${templateName}`, { templateName }, error instanceof Error ? error.stack : undefined);
    }
  }

  private renderTemplate(templateName: string, context: Record<string, any>): string {
    try {
      const template = this.loadTemplate(templateName);
      return template({
        ...context,
        // Add any global helpers or context variables here
        formatCurrency: (value: number, currency: string = 'USD') => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value);
        },
        formatDate: (date: string | Date) => {
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      });
    } catch (error) {
      this.logger.error(`Error rendering template: ${templateName}`, error);
      this.errorService.throwInternalServerError(`Failed to render template: ${templateName}`, { templateName }, error instanceof Error ? error.stack : undefined);
    }
  }
}
