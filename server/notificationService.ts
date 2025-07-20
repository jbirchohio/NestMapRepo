import { sendEmail } from './emailService';

interface ProposalNotificationData {
  proposalId: number;
  clientName: string;
  clientEmail: string;
  agentName: string;
  agentEmail: string;
  companyName: string;
  tripDestination: string;
  estimatedValue: number;
  proposalUrl: string;
  expirationDate?: Date;
}

interface ProposalViewData {
  proposalId: number;
  clientName: string;
  agentName: string;
  agentEmail: string;
  viewedAt: Date;
  timeSpent?: number;
  sectionsViewed?: string[];
}

export async function sendProposalSentNotification(data: ProposalNotificationData): Promise<boolean> {
  try {
    // Email to client
    const clientEmailSent = await sendEmail({
      to: data.clientEmail,
      from: `${data.agentName} <${data.agentEmail}>`,
      subject: `Travel Proposal for ${data.tripDestination} - ${data.companyName}`,
      html: generateProposalSentEmailHTML(data),
      text: generateProposalSentEmailText(data)
    });

    // Email to agent (confirmation)
    const agentEmailSent = await sendEmail({
      to: data.agentEmail,
      from: `NestMap Notifications <notifications@nestmap.app>`,
      subject: `Proposal Sent Confirmation - ${data.clientName}`,
      html: generateAgentConfirmationHTML(data),
      text: generateAgentConfirmationText(data)
    });

    return clientEmailSent && agentEmailSent;
  } catch (error) {
    console.error('Error sending proposal notification:', error);
    return false;
  }
}

export async function sendProposalViewedNotification(data: ProposalViewData): Promise<boolean> {
  try {
    const emailSent = await sendEmail({
      to: data.agentEmail,
      from: `NestMap Notifications <notifications@nestmap.app>`,
      subject: `🎉 ${data.clientName} viewed your proposal!`,
      html: generateProposalViewedHTML(data),
      text: generateProposalViewedText(data)
    });

    return emailSent;
  } catch (error) {
    console.error('Error sending proposal viewed notification:', error);
    return false;
  }
}

function generateProposalSentEmailHTML(data: ProposalNotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Travel Proposal</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .proposal-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 20px 0; background-color: #f9fafb; }
        .cta-button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .highlight { background-color: #dbeafe; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Travel Proposal is Ready!</h1>
          <p>Professional travel planning by ${data.companyName}</p>
        </div>
        
        <div class="content">
          <p>Dear ${data.clientName},</p>
          
          <p>Thank you for choosing ${data.companyName} for your travel planning needs. ${data.agentName} has prepared a comprehensive travel proposal for your upcoming trip to <strong>${data.tripDestination}</strong>.</p>
          
          <div class="proposal-card">
            <h3>📋 Proposal Details</h3>
            <p><strong>Destination:</strong> ${data.tripDestination}</p>
            <p><strong>Estimated Investment:</strong> <span class="highlight">$${data.estimatedValue.toLocaleString()}</span></p>
            <p><strong>Prepared by:</strong> ${data.agentName}</p>
            ${data.expirationDate ? `<p><strong>Valid until:</strong> ${data.expirationDate.toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${data.proposalUrl}" class="cta-button">📖 View Your Proposal</a>
          </div>
          
          <p><strong>What's included in your proposal:</strong></p>
          <ul>
            <li>✈️ Detailed itinerary with activities and timing</li>
            <li>💰 Comprehensive cost breakdown</li>
            <li>🏨 Accommodation and transportation recommendations</li>
            <li>📋 Terms and conditions</li>
            <li>✍️ Digital signature for easy approval</li>
          </ul>
          
          <p>If you have any questions or would like to discuss modifications, please don't hesitate to reach out to ${data.agentName} directly.</p>
          
          <p>We're excited to help make your travel dreams a reality!</p>
          
          <p>Best regards,<br>
          ${data.agentName}<br>
          ${data.companyName}</p>
        </div>
        
        <div class="footer">
          <p>This proposal was generated using NestMap's professional travel planning platform.</p>
          <p>Need support? Contact us at support@nestmap.app</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateProposalSentEmailText(data: ProposalNotificationData): string {
  return `
Your Travel Proposal is Ready!

Dear ${data.clientName},

Thank you for choosing ${data.companyName} for your travel planning needs. ${data.agentName} has prepared a comprehensive travel proposal for your upcoming trip to ${data.tripDestination}.

Proposal Details:
- Destination: ${data.tripDestination}
- Estimated Investment: $${data.estimatedValue.toLocaleString()}
- Prepared by: ${data.agentName}
${data.expirationDate ? `- Valid until: ${data.expirationDate.toLocaleDateString()}` : ''}

View your proposal: ${data.proposalUrl}

What's included:
- Detailed itinerary with activities and timing
- Comprehensive cost breakdown
- Accommodation and transportation recommendations
- Terms and conditions
- Digital signature for easy approval

If you have any questions, please reach out to ${data.agentName} directly.

Best regards,
${data.agentName}
${data.companyName}
  `.trim();
}

function generateAgentConfirmationHTML(data: ProposalNotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposal Sent Successfully</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success-card { border: 2px solid #d1fae5; border-radius: 12px; padding: 25px; margin: 20px 0; background-color: #f0fdf4; }
        .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Proposal Sent Successfully!</h1>
          <p>Your professional proposal is now in the client's hands</p>
        </div>
        
        <div class="content">
          <p>Hi ${data.agentName},</p>
          
          <div class="success-card">
            <h3>📧 Proposal Delivered</h3>
            <p><strong>Client:</strong> ${data.clientName}</p>
            <p><strong>Email:</strong> ${data.clientEmail}</p>
            <p><strong>Trip:</strong> ${data.tripDestination}</p>
            <p><strong>Value:</strong> $${data.estimatedValue.toLocaleString()}</p>
            <p><strong>Proposal URL:</strong> <a href="${data.proposalUrl}">${data.proposalUrl}</a></p>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>📊 Monitor proposal analytics in your dashboard</li>
            <li>📧 You'll receive notifications when the client views the proposal</li>
            <li>🔔 Get alerts when sections are viewed or signatures are collected</li>
            <li>💬 Follow up proactively based on engagement data</li>
          </ul>
          
          <p>Track this proposal's performance in your NestMap dashboard to see when it's opened, which sections get the most attention, and when it's ready for follow-up.</p>
          
          <p>Good luck closing this deal!</p>
          
          <p>Best regards,<br>
          The NestMap Team</p>
        </div>
        
        <div class="footer">
          <p>Professional travel proposals powered by NestMap</p>
          <p>View analytics: <a href="https://nestmap.app/proposals/analytics">Dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAgentConfirmationText(data: ProposalNotificationData): string {
  return `
Proposal Sent Successfully!

Hi ${data.agentName},

Your proposal has been successfully delivered to ${data.clientName}.

Proposal Details:
- Client: ${data.clientName} (${data.clientEmail})
- Trip: ${data.tripDestination}
- Value: $${data.estimatedValue.toLocaleString()}
- Proposal URL: ${data.proposalUrl}

Next Steps:
- Monitor proposal analytics in your dashboard
- You'll receive notifications when the client views the proposal
- Get alerts when sections are viewed or signatures are collected
- Follow up proactively based on engagement data

Track this proposal's performance in your NestMap dashboard.

Good luck closing this deal!

Best regards,
The NestMap Team
  `.trim();
}

function generateProposalViewedHTML(data: ProposalViewData): string {
  const sectionsText = data.sectionsViewed?.length 
    ? `<p><strong>Sections viewed:</strong> ${data.sectionsViewed.join(', ')}</p>`
    : ''
  
  const timeText = data.timeSpent 
    ? `<p><strong>Time spent:</strong> ${Math.round(data.timeSpent / 60)} minutes</p>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposal Viewed!</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .activity-card { border: 2px solid #fed7aa; border-radius: 12px; padding: 25px; margin: 20px 0; background-color: #fffbeb; }
        .cta-button { display: inline-block; background-color: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Great News!</h1>
          <p>${data.clientName} just viewed your proposal</p>
        </div>
        
        <div class="content">
          <p>Hi ${data.agentName},</p>
          
          <div class="activity-card">
            <h3>👀 Proposal Activity</h3>
            <p><strong>Client:</strong> ${data.clientName}</p>
            <p><strong>Viewed at:</strong> ${data.viewedAt.toLocaleString()}</p>
            ${timeText}
            ${sectionsText}
          </div>
          
          <p><strong>This is a great sign!</strong> Your client is actively reviewing the proposal. Now might be a perfect time to:</p>
          
          <ul>
            <li>📞 <strong>Follow up with a call</strong> - Strike while the iron is hot</li>
            <li>💬 <strong>Send a personal message</strong> - Ask if they have any questions</li>
            <li>📊 <strong>Check analytics</strong> - See which sections got the most attention</li>
            <li>⏰ <strong>Offer a consultation</strong> - Help them make the final decision</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="https://nestmap.app/proposals/analytics" class="cta-button">📈 View Full Analytics</a>
          </div>
          
          <p>Remember: Engaged prospects are more likely to book. Use this momentum to guide them toward signing the proposal!</p>
          
          <p>Keep up the great work!</p>
          
          <p>Best regards,<br>
          The NestMap Team</p>
        </div>
        
        <div class="footer">
          <p>Real-time proposal tracking powered by NestMap</p>
          <p>Maximize your conversion rates with engagement insights</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateProposalViewedText(data: ProposalViewData): string {
  const sectionsText = data.sectionsViewed?.length 
    ? `Sections viewed: ${data.sectionsViewed.join(', ')}`
    : ''
  
  const timeText = data.timeSpent 
    ? `Time spent: ${Math.round(data.timeSpent / 60)} minutes`
    : ''

  return `
Great News! ${data.clientName} viewed your proposal

Hi ${data.agentName},

Your proposal was just viewed by ${data.clientName}!

Activity Details:
- Client: ${data.clientName}
- Viewed at: ${data.viewedAt.toLocaleString()}
${timeText ? `- ${timeText}` : ''}
${sectionsText ? `- ${sectionsText}` : ''}

This is a great sign! Now might be perfect time to:
- Follow up with a call
- Send a personal message asking if they have questions
- Check analytics to see which sections got attention
- Offer a consultation to help them decide

Engaged prospects are more likely to book. Use this momentum!

View full analytics: https://nestmap.app/proposals/analytics

Keep up the great work!

Best regards,
The NestMap Team
  `.trim();
}