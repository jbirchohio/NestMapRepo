import { MailService } from '@sendgrid/mail';
import { getBrandingConfig } from './branding';

// Initialize mail service
let mailService: MailService | null = null;

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
    mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✓ SendGrid email service initialized');
} else {
    console.warn('⚠ SENDGRID_API_KEY not found - email features will be disabled');
}

interface BrandingContext {
    organizationId?: number;
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
    actionText?: string;
    type: 'trip_shared' | 'booking_confirmed' | 'activity_reminder' | 'team_invite' | 'payment_due' | 'system';
}

function generateNotificationHTML(params: NotificationEmailParams): string {
    const branding = getBrandingConfig();
    const actionButton = params.actionUrl && params.actionText 
        ? `<a href="${params.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${branding.primaryColor}; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">${params.actionText}</a>`
        : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${params.subject}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 24px; }
                .logo { max-width: 150px; height: auto; }
                .content { background-color: #f9f9f9; padding: 24px; border-radius: 8px; }
                .footer { margin-top: 24px; font-size: 12px; color: #666; text-align: center; }
                .action-button { display: inline-block; padding: 12px 24px; background-color: ${branding.primaryColor}; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${branding.logo}" alt="${branding.appName} Logo" class="logo">
            </div>
            <div class="content">
                <h1>${params.title}</h1>
                <p>${params.message}</p>
                ${actionButton}
            </div>
            <div class="footer">
                <p>  ${new Date().getFullYear()} ${branding.appName}. All rights reserved.</p>
                <p><a href="${branding.privacyUrl}" style="color: #666;">Privacy Policy</a> | <a href="${branding.termsUrl}" style="color: #666;">Terms of Service</a></p>
            </div>
        </body>
        </html>
    `;
}

export async function sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
    if (!mailService) {
        console.log('⚠ SendGrid not configured - email sending disabled');
        return false;
    }
    try {
        const msg = {
            to: params.to,
            from: process.env.FROM_EMAIL || 'noreply@nestmap.com',
            subject: params.subject,
            html: generateNotificationHTML(params),
        };
        await mailService.send(msg);
        console.log(`✓ Notification email sent to ${params.to}: ${params.subject}`);
        return true;
    } catch (error) {
        console.error('✗ Error sending notification email:', error);
        return false;
    }
}
export async function sendTeamInvitationEmail(params: TeamInvitationEmailParams): Promise<boolean> {
    if (!mailService) {
        console.log(`[EMAIL DISABLED] Would send invitation to ${params.to} for ${params.organizationName}`);
        return false;
    }
    try {
        const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/invite/${params.invitationToken}`;
        const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation - NestMap</title>
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
              <h1>🗺️ You're Invited to Join NestMap</h1>
              <p>Professional Travel Management Platform</p>
            </div>
            
            <div class="content">
              <h2>Welcome to ${params.organizationName}!</h2>
              
              <p><strong>${params.inviterName}</strong> has invited you to join their team on NestMap as a <span class="role-badge">${params.role.toUpperCase()}</span>.</p>
              
              <p>NestMap is a comprehensive travel planning platform that helps teams:</p>
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
              <p>© 2025 NestMap - Professional Travel Management</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
        await mailService.send({
            to: params.to,
            from: process.env.FROM_EMAIL || 'noreply@nestmap.app',
            subject: `You're invited to join ${params.organizationName} on NestMap`,
            html: emailHTML,
            text: `${params.inviterName} has invited you to join ${params.organizationName} on NestMap as a ${params.role}. Accept your invitation: ${invitationUrl}`
        });
        console.log(`✓ Team invitation email sent to ${params.to}`);
        return true;
    }
    catch (error) {
        console.error('✗ Failed to send team invitation email:', error);
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
        console.log(`[EMAIL DISABLED] Would send welcome email to ${params.to}`);
        return false;
    }
    try {
        const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to NestMap</title>
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
              <h1>🗺️ Welcome to NestMap!</h1>
              <p>Professional Travel Management Platform</p>
            </div>
            
            <div class="content">
              <h2>Hello ${params.name}! 👋</h2>
              
              ${params.organizationName ?
            `<p>You've successfully joined <strong>${params.organizationName}</strong> on NestMap!</p>` :
            `<p>Welcome to NestMap! You're all set to start planning amazing trips.</p>`}
              
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
              <p>© 2025 NestMap - Professional Travel Management</p>
              <p>Need help? Reply to this email or visit our support center.</p>
            </div>
          </div>
        </body>
      </html>
    `;
        await mailService.send({
            to: params.to,
            from: process.env.FROM_EMAIL || 'noreply@nestmap.app',
            subject: `Welcome to NestMap${params.organizationName ? ` - ${params.organizationName}` : ''}!`,
            html: emailHTML,
            text: `Welcome to NestMap! ${params.organizationName ? `You've joined ${params.organizationName}.` : ''} Start planning: ${process.env.FRONTEND_URL || 'http://localhost:5000'}`
        });
        console.log(`✓ Welcome email sent to ${params.to}`);
        return true;
    }
    catch (error) {
        console.error('✗ Failed to send welcome email:', error);
        return false;
    }
}
