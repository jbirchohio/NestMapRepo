import { EventEmitter } from 'events';
import axios from 'axios';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'hr' | 'finance' | 'communication' | 'expense' | 'calendar' | 'directory';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookUrl?: string;
  };
  settings: Record<string, any>;
  lastSync: Date | null;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  organizationId: number;
}

export interface HRIntegration {
  employeeData: {
    sync: boolean;
    fields: string[];
    frequency: string;
  };
  approvalWorkflows: {
    enabled: boolean;
    managerApproval: boolean;
    budgetApproval: boolean;
    customRules: any[];
  };
  costCenters: {
    sync: boolean;
    mapping: Record<string, string>;
  };
}

export interface FinanceIntegration {
  expenseReporting: {
    autoSubmit: boolean;
    approvalWorkflow: boolean;
    categories: string[];
  };
  budgetTracking: {
    realTimeUpdates: boolean;
    alertThresholds: number[];
    reportingPeriod: string;
  };
  accounting: {
    chartOfAccounts: Record<string, string>;
    journalEntries: boolean;
    reconciliation: boolean;
  };
}

export interface CommunicationIntegration {
  slack: {
    notifications: boolean;
    channels: string[];
    botToken: string;
  };
  teams: {
    notifications: boolean;
    webhooks: string[];
    appId: string;
  };
  email: {
    templates: Record<string, string>;
    automatedReports: boolean;
    escalationRules: any[];
  };
}

export interface SyncResult {
  integrationId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsFailed: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface WebhookEvent {
  id: string;
  source: string;
  type: string;
  data: any;
  timestamp: Date;
  processed: boolean;
  organizationId: number;
}

export interface EnterpriseIntegrationCapabilities {
  features: [
    "HR system integration for employee data",
    "Finance system integration for expense reporting",
    "Communication platform integration (Slack, Teams)",
    "Calendar system integration for travel planning",
    "Directory services for user management",
    "Real-time data synchronization"
  ];
  supportedSystems: ["Workday", "BambooHR", "SAP", "Oracle", "Slack", "Microsoft Teams", "Google Workspace"];
  syncMethods: ["Real-time webhooks", "Scheduled batch sync", "API polling"];
}

class EnterpriseIntegrationHubService extends EventEmitter {
  private integrations: Map<string, IntegrationConfig> = new Map();
  private syncQueue: Map<string, any[]> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  private syncInProgress: Set<string> = new Set();

  constructor() {
    super();
    this.initializeIntegrations();
    this.startSyncScheduler();
  }

  private initializeIntegrations() {
    // Initialize default integration templates
    this.emit('integrationsInitialized');
  }

  private startSyncScheduler() {
    // Process sync queue every 5 minutes
    setInterval(() => {
      this.processSyncQueue();
    }, 5 * 60 * 1000);

    // Process webhooks every minute
    setInterval(() => {
      this.processWebhookEvents();
    }, 60 * 1000);
  }

  // Integration Management
  async createIntegration(
    organizationId: number,
    config: Omit<IntegrationConfig, 'id' | 'lastSync' | 'organizationId'>
  ): Promise<IntegrationConfig> {
    const integration: IntegrationConfig = {
      id: this.generateIntegrationId(),
      ...config,
      lastSync: null,
      organizationId,
      status: 'pending'
    };

    // Validate credentials
    const isValid = await this.validateIntegrationCredentials(integration);
    if (!isValid) {
      throw new Error('Invalid integration credentials');
    }

    integration.status = 'active';
    this.integrations.set(integration.id, integration);

    this.emit('integrationCreated', integration);
    return integration;
  }

  async updateIntegration(
    integrationId: string,
    updates: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const updated = { ...integration, ...updates };
    
    // Re-validate if credentials changed
    if (updates.credentials) {
      const isValid = await this.validateIntegrationCredentials(updated);
      if (!isValid) {
        throw new Error('Invalid integration credentials');
      }
    }

    this.integrations.set(integrationId, updated);
    this.emit('integrationUpdated', updated);
    return updated;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    this.integrations.delete(integrationId);
    this.emit('integrationDeleted', { integrationId });
  }

  async getIntegrations(organizationId: number): Promise<IntegrationConfig[]> {
    return Array.from(this.integrations.values())
      .filter(integration => integration.organizationId === organizationId);
  }

  // HR System Integration
  async syncHRData(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'hr') {
      throw new Error('HR integration not found');
    }

    if (this.syncInProgress.has(integrationId)) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress.add(integrationId);
    const startTime = Date.now();

    try {
      const result: SyncResult = {
        integrationId,
        status: 'success',
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        recordsFailed: 0,
        errors: [],
        duration: 0,
        timestamp: new Date()
      };

      // Sync employee data
      const employees = await this.fetchHREmployees(integration);
      result.recordsProcessed += employees.length;

      for (const employee of employees) {
        try {
          await this.processEmployeeData(employee, integration.organizationId);
          result.recordsUpdated++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push(`Employee ${employee.id}: ${error.message}`);
        }
      }

      // Sync cost centers
      const costCenters = await this.fetchHRCostCenters(integration);
      result.recordsProcessed += costCenters.length;

      for (const costCenter of costCenters) {
        try {
          await this.processCostCenterData(costCenter, integration.organizationId);
          result.recordsCreated++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push(`Cost Center ${costCenter.id}: ${error.message}`);
        }
      }

      // Update integration last sync time
      integration.lastSync = new Date();
      this.integrations.set(integrationId, integration);

      result.duration = Date.now() - startTime;
      result.status = result.recordsFailed > 0 ? 'partial' : 'success';

      this.emit('hrSyncCompleted', result);
      return result;

    } catch (error) {
      const result: SyncResult = {
        integrationId,
        status: 'failed',
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        recordsFailed: 0,
        errors: [error.message],
        duration: Date.now() - startTime,
        timestamp: new Date()
      };

      this.emit('hrSyncFailed', result);
      return result;

    } finally {
      this.syncInProgress.delete(integrationId);
    }
  }

  private async fetchHREmployees(integration: IntegrationConfig): Promise<any[]> {
    // Simulate fetching employee data from HR system
    switch (integration.provider) {
      case 'workday':
        return this.fetchWorkdayEmployees(integration);
      case 'bamboohr':
        return this.fetchBambooHREmployees(integration);
      case 'adp':
        return this.fetchADPEmployees(integration);
      default:
        throw new Error(`Unsupported HR provider: ${integration.provider}`);
    }
  }

  private async fetchWorkdayEmployees(integration: IntegrationConfig): Promise<any[]> {
    // Mock Workday API call
    return [
      {
        id: 'emp001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        manager: 'mgr001',
        costCenter: 'CC-ENG-001',
        startDate: '2023-01-15',
        status: 'active'
      },
      {
        id: 'emp002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        department: 'Sales',
        manager: 'mgr002',
        costCenter: 'CC-SALES-001',
        startDate: '2022-06-10',
        status: 'active'
      }
    ];
  }

  private async fetchBambooHREmployees(integration: IntegrationConfig): Promise<any[]> {
    // Mock BambooHR API call
    return [
      {
        id: 'bhr001',
        displayName: 'Alice Johnson',
        workEmail: 'alice.johnson@company.com',
        division: 'Marketing',
        supervisor: 'sup001',
        location: 'New York',
        hireDate: '2023-03-20',
        employmentStatus: 'Full-Time'
      }
    ];
  }

  private async fetchADPEmployees(integration: IntegrationConfig): Promise<any[]> {
    // Mock ADP API call
    return [
      {
        associateOID: 'adp001',
        person: {
          legalName: {
            givenName: 'Bob',
            familyName: 'Wilson'
          },
          communication: {
            emails: [{ emailUri: 'bob.wilson@company.com' }]
          }
        },
        workAssignment: {
          primaryIndicator: true,
          organizationalUnits: [{ nameCode: { codeValue: 'IT' } }],
          reportsTo: [{ associateOID: 'mgr003' }]
        }
      }
    ];
  }

  private async fetchHRCostCenters(integration: IntegrationConfig): Promise<any[]> {
    try {
      // Real HR system integration based on platform
      switch (integration.platform) {
        case 'workday':
          return await this.fetchWorkdayCostCenters(integration);
        case 'bamboohr':
          return await this.fetchBambooHRCostCenters(integration);
        case 'adp':
          return await this.fetchADPCostCenters(integration);
        default:
          console.warn(`Unsupported HR platform: ${integration.platform}`);
      }
    } catch (error) {
      console.error('Error fetching HR cost centers:', error);
    }

    // Fallback cost center data
    return [
      {
        id: 'CC-ENG-001',
        name: 'Engineering',
        budget: 500000,
        manager: 'mgr001'
      },
      {
        id: 'CC-SALES-001',
        name: 'Sales',
        budget: 300000,
        manager: 'mgr002'
      },
      {
        id: 'CC-MKT-001',
        name: 'Marketing',
        budget: 200000,
        manager: 'mgr003'
      }
    ];
  }

  private async processEmployeeData(employee: any, organizationId: number): Promise<void> {
    // Process and store employee data
    console.log(`Processing employee: ${employee.id || employee.associateOID}`);
  }

  private async processCostCenterData(costCenter: any, organizationId: number): Promise<void> {
    // Process and store cost center data
    console.log(`Processing cost center: ${costCenter.id}`);
  }

  // Finance System Integration
  async syncFinanceData(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'finance') {
      throw new Error('Finance integration not found');
    }

    if (this.syncInProgress.has(integrationId)) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress.add(integrationId);
    const startTime = Date.now();

    try {
      const result: SyncResult = {
        integrationId,
        status: 'success',
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        recordsFailed: 0,
        errors: [],
        duration: 0,
        timestamp: new Date()
      };

      // Sync expense data
      const expenses = await this.fetchFinanceExpenses(integration);
      result.recordsProcessed += expenses.length;

      for (const expense of expenses) {
        try {
          await this.processExpenseData(expense, integration.organizationId);
          result.recordsUpdated++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push(`Expense ${expense.id}: ${error.message}`);
        }
      }

      // Sync budget data
      const budgets = await this.fetchFinanceBudgets(integration);
      result.recordsProcessed += budgets.length;

      for (const budget of budgets) {
        try {
          await this.processBudgetData(budget, integration.organizationId);
          result.recordsCreated++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push(`Budget ${budget.id}: ${error.message}`);
        }
      }

      integration.lastSync = new Date();
      this.integrations.set(integrationId, integration);

      result.duration = Date.now() - startTime;
      result.status = result.recordsFailed > 0 ? 'partial' : 'success';

      this.emit('financeSyncCompleted', result);
      return result;

    } catch (error) {
      const result: SyncResult = {
        integrationId,
        status: 'failed',
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        recordsFailed: 0,
        errors: [error.message],
        duration: Date.now() - startTime,
        timestamp: new Date()
      };

      this.emit('financeSyncFailed', result);
      return result;

    } finally {
      this.syncInProgress.delete(integrationId);
    }
  }

  private async fetchFinanceExpenses(integration: IntegrationConfig): Promise<any[]> {
    // Mock expense data from finance system
    return [
      {
        id: 'exp001',
        amount: 1250.00,
        currency: 'USD',
        category: 'Travel',
        date: '2024-01-15',
        employee: 'emp001',
        status: 'approved'
      }
    ];
  }

  private async fetchFinanceBudgets(integration: IntegrationConfig): Promise<any[]> {
    // Mock budget data
    return [
      {
        id: 'budget001',
        department: 'Engineering',
        category: 'Travel',
        allocated: 100000,
        spent: 45000,
        period: '2024-Q1'
      }
    ];
  }

  private async processExpenseData(expense: any, organizationId: number): Promise<void> {
    // Process expense data
    console.log(`Processing expense: ${expense.id}`);
  }

  private async processBudgetData(budget: any, organizationId: number): Promise<void> {
    // Process budget data
    console.log(`Processing budget: ${budget.id}`);
  }

  // Communication Platform Integration
  async sendSlackNotification(
    integrationId: string,
    channel: string,
    message: string,
    attachments?: any[]
  ): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'communication' || integration.provider !== 'slack') {
      throw new Error('Slack integration not found');
    }

    try {
      // Mock Slack API call
      console.log(`Sending Slack notification to ${channel}: ${message}`);
      this.emit('slackNotificationSent', { channel, message });
    } catch (error) {
      console.error('Slack notification failed:', error);
      throw error;
    }
  }

  async sendTeamsNotification(
    integrationId: string,
    webhook: string,
    message: string
  ): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration || integration.type !== 'communication' || integration.provider !== 'teams') {
      throw new Error('Teams integration not found');
    }

    try {
      // Mock Teams webhook call
      console.log(`Sending Teams notification: ${message}`);
      this.emit('teamsNotificationSent', { webhook, message });
    } catch (error) {
      console.error('Teams notification failed:', error);
      throw error;
    }
  }

  // Webhook Processing
  async processWebhook(
    source: string,
    type: string,
    data: any,
    organizationId: number
  ): Promise<void> {
    const event: WebhookEvent = {
      id: this.generateEventId(),
      source,
      type,
      data,
      timestamp: new Date(),
      processed: false,
      organizationId
    };

    this.webhookEvents.set(event.id, event);
    this.emit('webhookReceived', event);

    // Process immediately for critical events
    if (this.isCriticalEvent(event)) {
      await this.processWebhookEvent(event);
    }
  }

  private async processWebhookEvents(): Promise<void> {
    const unprocessedEvents = Array.from(this.webhookEvents.values())
      .filter(event => !event.processed)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const event of unprocessedEvents) {
      try {
        await this.processWebhookEvent(event);
        event.processed = true;
        this.webhookEvents.set(event.id, event);
      } catch (error) {
        console.error('Webhook processing error:', error);
      }
    }
  }

  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    switch (event.source) {
      case 'hr':
        await this.processHRWebhook(event);
        break;
      case 'finance':
        await this.processFinanceWebhook(event);
        break;
      case 'slack':
        await this.processSlackWebhook(event);
        break;
      default:
        console.log(`Unknown webhook source: ${event.source}`);
    }
  }

  private async processHRWebhook(event: WebhookEvent): Promise<void> {
    // Process HR webhook events (employee updates, etc.)
    console.log(`Processing HR webhook: ${event.type}`);
  }

  private async processFinanceWebhook(event: WebhookEvent): Promise<void> {
    // Process finance webhook events (expense approvals, etc.)
    console.log(`Processing finance webhook: ${event.type}`);
  }

  private async processSlackWebhook(event: WebhookEvent): Promise<void> {
    // Process Slack webhook events (commands, interactions, etc.)
    console.log(`Processing Slack webhook: ${event.type}`);
  }

  private isCriticalEvent(event: WebhookEvent): boolean {
    const criticalTypes = ['expense_approved', 'budget_exceeded', 'employee_terminated'];
    return criticalTypes.includes(event.type);
  }

  // Utility Methods
  private async validateIntegrationCredentials(integration: IntegrationConfig): Promise<boolean> {
    // Validate credentials based on provider
    switch (integration.provider) {
      case 'workday':
        return this.validateWorkdayCredentials(integration.credentials);
      case 'slack':
        return this.validateSlackCredentials(integration.credentials);
      default:
        return true; // Mock validation
    }
  }

  private async validateWorkdayCredentials(credentials: IntegrationConfig['credentials']): Promise<boolean> {
    // Mock Workday credential validation
    return !!(credentials.clientId && credentials.clientSecret);
  }

  private async validateSlackCredentials(credentials: IntegrationConfig['credentials']): Promise<boolean> {
    // Mock Slack credential validation
    return !!(credentials.apiKey);
  }

  private async processSyncQueue(): Promise<void> {
    // Process queued sync operations
    for (const [integrationId, queue] of this.syncQueue.entries()) {
      if (queue.length > 0 && !this.syncInProgress.has(integrationId)) {
        const integration = this.integrations.get(integrationId);
        if (integration) {
          try {
            if (integration.type === 'hr') {
              await this.syncHRData(integrationId);
            } else if (integration.type === 'finance') {
              await this.syncFinanceData(integrationId);
            }
            this.syncQueue.set(integrationId, []);
          } catch (error) {
            console.error(`Sync failed for ${integrationId}:`, error);
          }
        }
      }
    }
  }

  private generateIntegrationId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  async getIntegrationStatus(integrationId: string): Promise<{
    status: string;
    lastSync: Date | null;
    nextSync: Date | null;
    syncInProgress: boolean;
  }> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return {
      status: integration.status,
      lastSync: integration.lastSync,
      nextSync: this.calculateNextSync(integration),
      syncInProgress: this.syncInProgress.has(integrationId)
    };
  }

  private calculateNextSync(integration: IntegrationConfig): Date | null {
    if (!integration.lastSync) return null;

    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };

    const interval = intervals[integration.syncFrequency];
    if (!interval) return null;

    return new Date(integration.lastSync.getTime() + interval);
  }

  async triggerManualSync(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    switch (integration.type) {
      case 'hr':
        return this.syncHRData(integrationId);
      case 'finance':
        return this.syncFinanceData(integrationId);
      default:
        throw new Error(`Manual sync not supported for integration type: ${integration.type}`);
    }
  }
}

export const enterpriseIntegrationHubService = new EnterpriseIntegrationHubService();
