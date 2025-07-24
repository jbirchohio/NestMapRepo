import { Injectable } from '@nestjs/common';
import logger from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface PasswordResetEmailData {
  userEmail: string;
  resetToken: string;
  baseUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = logger;
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@nestmap.com';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // Production email service selection based on environment variable
      if (process.env.EMAIL_PROVIDER === 'sendgrid') {
        await this.sendWithSendGrid(options);
      } else if (process.env.EMAIL_PROVIDER === 'ses') {
        await this.sendWithSES(options);
      } else if (process.env.EMAIL_PROVIDER === 'smtp') {
        await this.sendWithSMTP(options);
      } else {
        throw new Error('EMAIL_PROVIDER environment variable must be set to: sendgrid, ses, or smtp');
      }
      
      this.logger.info(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject
      });
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const resetUrl = `${data.baseUrl || this.baseUrl}/reset-password?token=${data.resetToken}`;
    
    const emailOptions: EmailOptions = {
      to: data.userEmail,
      subject: 'Password Reset Request',
      from: this.fromEmail,
      html: this.generatePasswordResetHTML(resetUrl),
      text: this.generatePasswordResetText(resetUrl)
    };

    await this.sendEmail(emailOptions);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const emailOptions: EmailOptions = {
      to: userEmail,
      subject: 'Welcome to NestMap',
      from: this.fromEmail,
      html: this.generateWelcomeHTML(userName),
      text: this.generateWelcomeText(userName)
    };

    await this.sendEmail(emailOptions);
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmationEmail(
    userEmail: string,
    bookingDetails: any
  ): Promise<void> {
    const emailOptions: EmailOptions = {
      to: userEmail,
      subject: `Booking Confirmation - ${bookingDetails.reference}`,
      from: this.fromEmail,
      html: this.generateBookingConfirmationHTML(bookingDetails),
      text: this.generateBookingConfirmationText(bookingDetails)
    };

    await this.sendEmail(emailOptions);
  }

  // Private methods for different email providers

  private async sendWithSendGrid(options: EmailOptions): Promise<void> {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);
    
    const msg = {
      to: options.to,
      from: options.from || this.fromEmail,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await sgMail.default.send(msg);
    this.logger.info('Email sent via SendGrid', { to: options.to });
  }

  private async sendWithSES(options: EmailOptions): Promise<void> {
    try {
      // Try to import AWS SDK v3 first, then fallback to v2, then error
      let ses: any;
      let sendCommand: any;
      
      try {
        const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
        ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
        
        const params = {
          Source: options.from || this.fromEmail,
          Destination: {
            ToAddresses: [options.to],
          },
          Message: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: options.text ? {
                Data: options.text,
                Charset: 'UTF-8',
              } : undefined,
              Html: options.html ? {
                Data: options.html,
                Charset: 'UTF-8',
              } : undefined,
            },
          },
        };

        sendCommand = new SendEmailCommand(params);
        await ses.send(sendCommand);
      } catch (v3Error) {
        // Fallback to AWS SDK v2
        try {
          const AWS = await import('aws-sdk');
          ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
          
          const params = {
            Source: options.from || this.fromEmail,
            Destination: {
              ToAddresses: [options.to],
            },
            Message: {
              Subject: {
                Data: options.subject,
                Charset: 'UTF-8',
              },
              Body: {
                Text: options.text ? {
                  Data: options.text,
                  Charset: 'UTF-8',
                } : undefined,
                Html: options.html ? {
                  Data: options.html,
                  Charset: 'UTF-8',
                } : undefined,
              },
            },
          };

          await ses.sendEmail(params).promise();
        } catch (v2Error) {
          throw new Error('AWS SES not available. Please install @aws-sdk/client-ses or aws-sdk package.');
        }
      }
      
      this.logger.info('Email sent via AWS SES', { to: options.to });
    } catch (error) {
      this.logger.error('Failed to send via SES:', error);
      throw new Error('AWS SES email delivery failed');
    }
  }

  private async sendWithSMTP(options: EmailOptions): Promise<void> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Use type assertion to handle module format differences
      const mailer = nodemailer.default || nodemailer;
      const transporter = (mailer as any).createTransport({
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      });

      await transporter.sendMail({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.info('Email sent via SMTP', { to: options.to });
    } catch (error) {
      this.logger.error('Failed to send via SMTP:', error);
      throw new Error('SMTP email delivery failed');
    }
  }

  // HTML template generators

  private generatePasswordResetHTML(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested a password reset for your NestMap account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p><small>This link will expire in 24 hours. If you didn't request this, please ignore this email.</small></p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetText(resetUrl: string): string {
    return `
Password Reset Request

You requested a password reset for your NestMap account.

To reset your password, visit: ${resetUrl}

This link will expire in 24 hours. If you didn't request this, please ignore this email.
    `.trim();
  }

  private generateWelcomeHTML(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to NestMap</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Welcome to NestMap!</h2>
          <p>Hi ${userName},</p>
          <p>Welcome to NestMap, your AI-powered corporate travel management platform!</p>
          <p>Get started by exploring these features:</p>
          <ul>
            <li>✈️ Book flights and hotels</li>
            <li>🗓️ Sync with your calendar</li>
            <li>🤖 Use voice commands for bookings</li>
            <li>📊 Track travel analytics</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.baseUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Using NestMap
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeText(userName: string): string {
    return `
Welcome to NestMap!

Hi ${userName},

Welcome to NestMap, your AI-powered corporate travel management platform!

Get started by exploring these features:
- ✈️ Book flights and hotels
- 🗓️ Sync with your calendar  
- 🤖 Use voice commands for bookings
- 📊 Track travel analytics

Visit: ${this.baseUrl}
    `.trim();
  }

  private generateBookingConfirmationHTML(bookingDetails: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Booking Confirmed!</h2>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Confirmation Number:</strong> ${bookingDetails.reference}</p>
            <p><strong>Type:</strong> ${bookingDetails.type}</p>
            <p><strong>Total Amount:</strong> ${bookingDetails.currency} ${bookingDetails.totalAmount}</p>
            <p><strong>Status:</strong> ${bookingDetails.status}</p>
          </div>
          <p>Thank you for using NestMap for your travel needs!</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateBookingConfirmationText(bookingDetails: any): string {
    return `
Booking Confirmed!

Your booking has been confirmed. Here are the details:

Confirmation Number: ${bookingDetails.reference}
Type: ${bookingDetails.type}
Total Amount: ${bookingDetails.currency} ${bookingDetails.totalAmount}
Status: ${bookingDetails.status}

Thank you for using NestMap for your travel needs!
    `.trim();
  }
}
