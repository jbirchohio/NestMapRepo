import axios from 'axios';
import { auditLogger } from './auditLogger';

export interface CommunicationProvider {
  id: string;
  organizationId: number;
  type: 'slack' | 'teams' | 'discord' | 'webhook';
  name: string;
  isEnabled: boolean;
  config: CommunicationConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationConfig {
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  teamId?: string;
  customFields?: Record<string, string>;
}

export interface NotificationMessage {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  actions?: MessageAction[];
  attachments?: MessageAttachment[];
}

export interface MessageAction {
  id: string;
  text: string;
  url?: string;
  style?: 'primary' | 'danger' | 'default';
  confirm?: {
    title: string;
    text: string;
    okText: string;
    dismissText: string;
  };
}

export interface MessageAttachment {
  title?: string;
  text?: string;
  color?: string;
  fields?: AttachmentField[];
  imageUrl?: string;
  thumbUrl?: string;
  footer?: string;
  timestamp?: Date;
}

export interface AttachmentField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export class CommunicationIntegrationService {
  private static instance: CommunicationIntegrationService;
  private providers: Map<number, CommunicationProvider[]> = new Map();

  static getInstance(): CommunicationIntegrationService {
    if (!CommunicationIntegrationService.instance) {
      CommunicationIntegrationService.instance = new CommunicationIntegrationService();
    }
    return CommunicationIntegrationService.instance;
  }

  // Configure communication provider
  async configureProvider(
    organizationId: number,
    type: 'slack' | 'teams' | 'discord' | 'webhook',
    name: string,
    config: CommunicationConfig
  ): Promise<CommunicationProvider> {
    const provider: CommunicationProvider = {
      id: `${type}-${organizationId}-${Date.now()}`,
      organizationId,
      type,
      name,
      isEnabled: true,
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test the configuration
    const testResult = await this.testProvider(provider);
    if (!testResult.success) {
      throw new Error(`Provider configuration test failed: ${testResult.error}`);
    }

    const orgProviders = this.providers.get(organizationId) || [];
    orgProviders.push(provider);
    this.providers.set(organizationId, orgProviders);

    await auditLogger.log({
      organizationId: organizationId.toString(),
      action: 'communication_provider_configured',
      details: {
        providerType: type,
        providerId: provider.id,
        providerName: name
      },
      userId: '',
      logType: ''
    });

    return provider;
  }

  // Send notification to all configured providers
  async sendNotification(
    organizationId: number,
    message: NotificationMessage,
    providerIds?: string[]
  ): Promise<SendResult[]> {
    const orgProviders = this.providers.get(organizationId) || [];
    const targetProviders = providerIds 
      ? orgProviders.filter(p => providerIds.includes(p.id) && p.isEnabled)
      : orgProviders.filter(p => p.isEnabled);

    const results: SendResult[] = [];

    for (const provider of targetProviders) {
      try {
        let result: SendResult;
        
        switch (provider.type) {
          case 'slack':
            result = await this.sendSlackMessage(provider, message);
            break;
          case 'teams':
            result = await this.sendTeamsMessage(provider, message);
            break;
          case 'discord':
            result = await this.sendDiscordMessage(provider, message);
            break;
          case 'webhook':
            result = await this.sendWebhookMessage(provider, message);
            break;
          default:
            result = {
              success: false,
              error: `Unsupported provider type: ${provider.type}`,
              timestamp: new Date()
            };
        }

        results.push(result);

        await auditLogger.log({
          organizationId: organizationId.toString(),
          action: 'notification_sent',
          details: {
            providerId: provider.id,
            providerType: provider.type,
            messageType: message.type,
            success: result.success,
            error: result.error
          },
          userId: '',
          logType: ''
        });

      } catch (error) {
        const errorResult: SendResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
        results.push(errorResult);
      }
    }

    return results;
  }

  // Slack integration
  private async sendSlackMessage(provider: CommunicationProvider, message: NotificationMessage): Promise<SendResult> {
    try {
      const slackMessage = await this.formatSlackMessage(message);
      
      let response;
      
      if (provider.config.webhookUrl) {
        // Use webhook
        response = await axios.post(provider.config.webhookUrl, slackMessage);
      } else if (provider.config.botToken && provider.config.channelId) {
        // Use bot token
        response = await axios.post('https://slack.com/api/chat.postMessage', {
          channel: provider.config.channelId,
          ...slackMessage
        }, {
          headers: {
            'Authorization': `Bearer ${provider.config.botToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        throw new Error('Slack provider not properly configured');
      }

      return {
        success: true,
        messageId: response.data.ts || response.data.message?.ts,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async formatSlackMessage(message: NotificationMessage): Promise<any> {
    const color = this.getSlackColor(message.type);
    
    const slackMessage: any = {
      text: message.title,
      attachments: []
    };

    // Main message attachment
    const mainAttachment: any = {
      color,
      title: message.title,
      text: message.message,
      footer: 'NestMap',
      ts: Math.floor(Date.now() / 1000)
    };

    // Add custom attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        const slackAttachment: any = {
          color: attachment.color || color,
          title: attachment.title,
          text: attachment.text,
          image_url: attachment.imageUrl,
          thumb_url: attachment.thumbUrl,
          footer: attachment.footer,
          ts: attachment.timestamp ? Math.floor(attachment.timestamp.getTime() / 1000) : undefined
        };

        if (attachment.fields) {
          slackAttachment.fields = attachment.fields.map(field => ({
            title: field.title,
            value: field.value,
            short: field.short || false
          }));
        }

        slackMessage.attachments.push(slackAttachment);
      }
    } else {
      slackMessage.attachments.push(mainAttachment);
    }

    // Add actions
    if (message.actions) {
      const actionAttachment: any = {
        color,
        callback_id: 'nestmap_actions',
        actions: message.actions.map(action => ({
          name: action.id,
          text: action.text,
          type: 'button',
          url: action.url,
          style: action.style === 'danger' ? 'danger' : action.style === 'primary' ? 'primary' : 'default',
          confirm: action.confirm ? {
            title: action.confirm.title,
            text: action.confirm.text,
            ok_text: action.confirm.okText,
            dismiss_text: action.confirm.dismissText
          } : undefined
        }))
      };

      slackMessage.attachments.push(actionAttachment);
    }

    return slackMessage;
  }

  // Microsoft Teams integration
  private async sendTeamsMessage(provider: CommunicationProvider, message: NotificationMessage): Promise<SendResult> {
    try {
      const teamsMessage = await this.formatTeamsMessage(message);
      
      if (!provider.config.webhookUrl) {
        throw new Error('Teams webhook URL not configured');
      }

      const response = await axios.post(provider.config.webhookUrl, teamsMessage);

      return {
        success: true,
        messageId: response.data.id,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async formatTeamsMessage(message: NotificationMessage): Promise<any> {
    const themeColor = this.getTeamsColor(message.type);
    
    const teamsMessage: any = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: message.title,
      sections: [
        {
          activityTitle: message.title,
          activitySubtitle: 'NestMap Notification',
          activityImage: 'https://nestmap.com/logo.png',
          text: message.message,
          markdown: true
        }
      ]
    };

    // Add facts from attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.fields) {
          const section: any = {
            title: attachment.title,
            facts: attachment.fields.map(field => ({
              name: field.title,
              value: field.value
            }))
          };
          teamsMessage.sections.push(section);
        }
      }
    }

    // Add actions
    if (message.actions) {
      teamsMessage.potentialAction = message.actions.map(action => ({
        '@type': 'OpenUri',
        name: action.text,
        targets: [
          {
            os: 'default',
            uri: action.url || '#'
          }
        ]
      }));
    }

    return teamsMessage;
  }

  // Discord integration
  private async sendDiscordMessage(provider: CommunicationProvider, message: NotificationMessage): Promise<SendResult> {
    try {
      const discordMessage = await this.formatDiscordMessage(message);
      
      if (!provider.config.webhookUrl) {
        throw new Error('Discord webhook URL not configured');
      }

      const response = await axios.post(provider.config.webhookUrl, discordMessage);

      return {
        success: true,
        messageId: response.data.id,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async formatDiscordMessage(message: NotificationMessage): Promise<any> {
    const color = this.getDiscordColor(message.type);
    
    const discordMessage: any = {
      username: 'NestMap',
      avatar_url: 'https://nestmap.com/logo.png',
      embeds: [
        {
          title: message.title,
          description: message.message,
          color,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'NestMap',
            icon_url: 'https://nestmap.com/logo.png'
          }
        }
      ]
    };

    // Add fields from attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.fields) {
          const embed = discordMessage.embeds[0];
          embed.fields = attachment.fields.map(field => ({
            name: field.title,
            value: field.value,
            inline: field.short || false
          }));
        }
      }
    }

    return discordMessage;
  }

  // Generic webhook integration
  private async sendWebhookMessage(provider: CommunicationProvider, message: NotificationMessage): Promise<SendResult> {
    try {
      if (!provider.config.webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      const webhookPayload = {
        timestamp: new Date().toISOString(),
        source: 'nestmap',
        notification: message
      };

      const response = await axios.post(provider.config.webhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NestMap-Webhook/1.0'
        }
      });

      return {
        success: true,
        messageId: response.data.id || response.data.messageId,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  // Test provider configuration
  async testProvider(provider: CommunicationProvider): Promise<SendResult> {
    const testMessage: NotificationMessage = {
      title: 'NestMap Integration Test',
      message: 'This is a test message to verify your communication integration is working correctly.',
      type: 'info',
      priority: 'normal'
    };

    switch (provider.type) {
      case 'slack':
        return await this.sendSlackMessage(provider, testMessage);
      case 'teams':
        return await this.sendTeamsMessage(provider, testMessage);
      case 'discord':
        return await this.sendDiscordMessage(provider, testMessage);
      case 'webhook':
        return await this.sendWebhookMessage(provider, testMessage);
      default:
        return {
          success: false,
          error: `Unsupported provider type: ${provider.type}`,
          timestamp: new Date()
        };
    }
  }

  // Send trip-related notifications
  async sendTripNotification(
    organizationId: number,
    type: 'created' | 'updated' | 'approved' | 'rejected' | 'cancelled',
    tripData: any,
    userId?: number
  ): Promise<SendResult[]> {
    const message: NotificationMessage = {
      title: `Trip ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      message: `Trip "${tripData.title}" has been ${type}`,
      type: type === 'approved' ? 'success' : type === 'rejected' ? 'error' : 'info',
      priority: 'normal',
      data: { tripId: tripData.id, userId },
      attachments: [
        {
          title: 'Trip Details',
          fields: [
            { title: 'Destination', value: tripData.destination || 'N/A', short: true },
            { title: 'Budget', value: tripData.budget ? `$${tripData.budget}` : 'N/A', short: true },
            { title: 'Start Date', value: tripData.startDate || 'N/A', short: true },
            { title: 'End Date', value: tripData.endDate || 'N/A', short: true }
          ]
        }
      ],
      actions: [
        {
          id: 'view_trip',
          text: 'View Trip',
          url: `${process.env.CLIENT_URL}/trips/${tripData.id}`,
          style: 'primary'
        }
      ]
    };

    return await this.sendNotification(organizationId, message);
  }

  // Send approval notifications
  async sendApprovalNotification(
    organizationId: number,
    type: 'required' | 'approved' | 'rejected',
    approvalData: any
  ): Promise<SendResult[]> {
    const message: NotificationMessage = {
      title: `Approval ${type === 'required' ? 'Required' : type.charAt(0).toUpperCase() + type.slice(1)}`,
      message: type === 'required' 
        ? `Your approval is required for: ${approvalData.title}`
        : `Approval request has been ${type}: ${approvalData.title}`,
      type: type === 'approved' ? 'success' : type === 'rejected' ? 'error' : 'warning',
      priority: approvalData.priority || 'normal',
      data: { requestId: approvalData.id },
      attachments: [
        {
          title: 'Approval Details',
          fields: [
            { title: 'Entity Type', value: approvalData.entityType, short: true },
            { title: 'Priority', value: approvalData.priority, short: true },
            { title: 'Requested By', value: approvalData.requesterName || 'N/A', short: true },
            { title: 'Due Date', value: approvalData.dueDate || 'N/A', short: true }
          ]
        }
      ],
      actions: type === 'required' ? [
        {
          id: 'approve',
          text: 'Approve',
          url: `${process.env.CLIENT_URL}/approvals/${approvalData.id}?action=approve`,
          style: 'primary'
        },
        {
          id: 'reject',
          text: 'Reject',
          url: `${process.env.CLIENT_URL}/approvals/${approvalData.id}?action=reject`,
          style: 'danger'
        }
      ] : [
        {
          id: 'view_request',
          text: 'View Request',
          url: `${process.env.CLIENT_URL}/approvals/${approvalData.id}`,
          style: 'default'
        }
      ]
    };

    return await this.sendNotification(organizationId, message);
  }

  // Get configured providers
  async getProviders(organizationId: number): Promise<CommunicationProvider[]> {
    return this.providers.get(organizationId) || [];
  }

  // Update provider configuration
  async updateProvider(
    organizationId: number,
    providerId: string,
    updates: Partial<CommunicationProvider>
  ): Promise<CommunicationProvider | null> {
    const orgProviders = this.providers.get(organizationId) || [];
    const providerIndex = orgProviders.findIndex(p => p.id === providerId);
    
    if (providerIndex === -1) return null;

    orgProviders[providerIndex] = {
      ...orgProviders[providerIndex],
      ...updates,
      updatedAt: new Date()
    };

    return orgProviders[providerIndex];
  }

  // Delete provider
  async deleteProvider(organizationId: number, providerId: string): Promise<boolean> {
    const orgProviders = this.providers.get(organizationId) || [];
    const filteredProviders = orgProviders.filter(p => p.id !== providerId);
    
    if (filteredProviders.length === orgProviders.length) return false;
    
    this.providers.set(organizationId, filteredProviders);
    return true;
  }

  // Helper methods for colors
  private getSlackColor(type: string): string {
    const colors = {
      'info': '#36a64f',
      'success': '#36a64f',
      'warning': '#ff9f00',
      'error': '#ff0000'
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  private getTeamsColor(type: string): string {
    const colors = {
      'info': '0078D4',
      'success': '107C10',
      'warning': 'FF8C00',
      'error': 'D13438'
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  private getDiscordColor(type: string): number {
    const colors = {
      'info': 0x0078D4,
      'success': 0x107C10,
      'warning': 0xFF8C00,
      'error': 0xD13438
    };
    return colors[type as keyof typeof colors] || colors.info;
  }
}

export const communicationIntegrationService = CommunicationIntegrationService.getInstance();

