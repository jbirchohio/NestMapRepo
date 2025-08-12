import { MailService } from '@sendgrid/mail';
import { logger } from './utils/logger';

let mailService: MailService | null = null;

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info('✓ SendGrid email service initialized');
} else {
  logger.warn('⚠ SENDGRID_API_KEY not found - email features will be disabled');
}

interface BrandingContext {
  domain?: string;
}

interface TeamInvitationEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  invitationToken: string;
  role: string;
}

interface NotificationEmailParams {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  ctaLink?: string;
  actionText?: string;
  type: 'trip_shared' | 'booking_confirmed' | 'activity_reminder' | 'team_invite' | 'payment_due' | 'system';
}

function generateNotificationHTML(params: NotificationEmailParams): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${params.subject}</h2>
      <p>${params.message}</p>
      ${params.ctaLink ? `
        <div style="margin: 30px 0;">
          <a href="${params.ctaLink}" style="background: #6D5DFB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Details</a>
        </div>
      ` : ''}
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 14px;">This is an automated message from Remvana</p>
    </div>
  `;
}

export async function sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: params.to,
      from: process.env.FROM_EMAIL || 'admin@remvana.com',
      subject: params.subject,
      html: generateNotificationHTML(params),
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    return false;
  }
}

export async function sendTeamInvitationEmail(params: TeamInvitationEmailParams): Promise<boolean> {
  if (!mailService) {
    return false;
  }

  try {
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/invite/${params.invitationToken}`;

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation - Remvana</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #64748b; font-size: 14px; }
            .role-badge { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ You're Invited to Join Remvana</h1>
              <p>Professional Travel Management Platform</p>
            </div>

            <div class="content">
              <h2>Welcome to ${params.organizationName}!</h2>

              <p><strong>${params.inviterName}</strong> has invited you to join their team on Remvana as a <span class="role-badge">${params.role.toUpperCase()}</span>.</p>

              <p>Remvana is a comprehensive travel planning platform that helps teams:</p>
              <ul>
                <li>📅 Create and manage collaborative itineraries</li>
                <li>🤝 Share trips with team members and clients</li>
                <li>📊 Track travel analytics and budgets</li>
                <li>🚀 Streamline business travel workflows</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="button">Accept Invitation</a>
              </div>

              <p><small>This invitation will expire in 7 days. If you have trouble with the button above, copy and paste this link: ${invitationUrl}</small></p>
            </div>

            <div class="footer">
              <p>© 2025 Remvana - Professional Travel Management</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: process.env.FROM_EMAIL || 'noreply@remvana.app',
      subject: `You're invited to join ${params.organizationName} on Remvana`,
      html: emailHTML,
      text: `${params.inviterName} has invited you to join ${params.organizationName} on Remvana as a ${params.role}. Accept your invitation: ${invitationUrl}`
    });

    return true;
  } catch (error) {
    return false;
  }
}

interface WelcomeEmailParams {
  to: string;
  name: string;
  organizationName?: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  if (!mailService) {
    return false;
  }

  try {
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Remvana</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ Welcome to Remvana!</h1>
              <p>Professional Travel Management Platform</p>
            </div>

            <div class="content">
              <h2>Hello ${params.name}! 👋</h2>

              ${params.organizationName ?
                `<p>You've successfully joined <strong>${params.organizationName}</strong> on Remvana!</p>` :
                `<p>Welcome to Remvana! You're all set to start planning amazing trips.</p>`
              }

              <p>Here's what you can do now:</p>
              <ul>
                <li>🗺️ Create your first collaborative itinerary</li>
                <li>🤖 Use AI-powered travel recommendations</li>
                <li>📱 Access your trips on any device</li>
                <li>📊 Track travel budgets and analytics</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" class="button">Start Planning</a>
              </div>
            </div>

            <div class="footer">
              <p>© 2025 Remvana - Professional Travel Management</p>
              <p>Need help? Reply to this email or visit our support center.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: process.env.FROM_EMAIL || 'noreply@remvana.app',
      subject: `Welcome to Remvana${params.organizationName ? ` - ${params.organizationName}` : ''}!`,
      html: emailHTML,
      text: `Welcome to Remvana! ${params.organizationName ? `You've joined ${params.organizationName}.` : ''} Start planning: ${process.env.FRONTEND_URL || 'http://localhost:5000'}`
    });

    return true;
  } catch (error) {
    return false;
  }
}