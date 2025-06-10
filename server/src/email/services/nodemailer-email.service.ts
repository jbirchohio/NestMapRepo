import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { 
  EmailService, 
  EmailOptions, 
  PasswordResetEmailOptions, 
  PasswordResetConfirmationOptions 
} from '../interfaces/email.service.interface';

@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
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
    const { to, subject, template, context = {} } = options;
    const from = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html: this.renderTemplate(template, context),
      });
      
      this.logger.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(
    email: string, 
    options: PasswordResetEmailOptions
  ): Promise<void> {
    const { name, resetUrl, expiryHours } = options;
    
    const subject = 'Password Reset Request';
    const template = 'password-reset';
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
    const { name } = options;
    
    const subject = 'Password Reset Successful';
    const template = 'password-reset-confirmation';
    const context = {
      name,
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@example.com'),
    };

    await this.sendEmail({ to: email, subject, template, context });
  }

  private renderTemplate(templateName: string, context: Record<string, any>): string {
    // In a real application, you would use a templating engine like Handlebars or EJS
    // For simplicity, we'll use a simple string replacement here
    const templates: Record<string, (ctx: any) => string> = {
      'password-reset': (ctx) => `
        <div>
          <h2>Hello ${ctx.name},</h2>
          <p>You recently requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${ctx.resetUrl}">Reset Password</a></p>
          <p>This link will expire in ${ctx.expiryHours} hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Thanks,<br>${ctx.supportEmail}</p>
        </div>
      `,
      'password-reset-confirmation': (ctx) => `
        <div>
          <h2>Hello ${ctx.name},</h2>
          <p>Your password has been successfully reset.</p>
          <p>If you didn't make this change, please contact our support team immediately at ${ctx.supportEmail}.</p>
          <p>Thanks,<br>${ctx.supportEmail}</p>
        </div>
      `,
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template(context);
  }
}
