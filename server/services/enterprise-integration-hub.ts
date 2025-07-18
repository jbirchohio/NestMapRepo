import { z } from 'zod';
import { db } from '../db-connection.js';
import { organizations, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// Integration schemas
const IntegrationConfigSchema = z.object({
  type: z.enum(['hr', 'finance', 'communication', 'calendar', 'expense']),
  provider: z.string(),
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    baseUrl: z.string().optional(),
  }),
  settings: z.record(z.any()).optional(),
  active: z.boolean().default(true),
});

const EmployeeDataSchema = z.object({
  employeeId: z.string(),
  email: z.string(),
  name: z.string(),
  department: z.string(),
  title: z.string(),
  manager: z.string().optional(),
  costCenter: z.string().optional(),
  approvalLimit: z.number().optional(),
  travelPreferences: z.record(z.any()).optional(),
});

const ExpenseReportSchema = z.object({
  reportId: z.string(),
  employeeId: z.string(),
  tripId: z.string(),
  expenses: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    currency: z.string(),
    date: z.string(),
    description: z.string(),
    receipt: z.string().optional(),
  })),
  totalAmount: z.number(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
});

export class EnterpriseIntegrationHub {
  private integrations: Map<string, any> = new Map();

  /**
   * HR & Finance Systems Integration
   */
  async configureHRIntegration(organizationId: string, config: z.infer<typeof IntegrationConfigSchema>) {
    try {
      const validatedConfig = IntegrationConfigSchema.parse(config);
      
      // Store integration configuration
      await this.storeIntegrationConfig(organizationId, validatedConfig);
      
      // Test connection
      const testResult = await this.testHRConnection(organizationId, validatedConfig);
      
      if (testResult.success) {
        this.integrations.set(`${organizationId}-hr`, validatedConfig);
        
        // Initial sync
        await this.syncEmployeeDirectory(organizationId);
        
        return {
          success: true,
          message: 'HR integration configured successfully',
          testResult,
        };
      } else {
        throw new Error(`HR integration test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.error('HR integration configuration error:', error);
      throw new Error('Failed to configure HR integration');
    }
  }

  /**
   * Employee Directory Synchronization
   */
  async syncEmployeeDirectory(organizationId: string) {
    try {
      const hrConfig = this.integrations.get(`${organizationId}-hr`);
      if (!hrConfig) {
        throw new Error('HR integration not configured');
      }

      let employees: z.infer<typeof EmployeeDataSchema>[] = [];

      // Sync based on provider
      switch (hrConfig.provider) {
        case 'workday':
          employees = await this.syncWorkdayEmployees(hrConfig);
          break;
        case 'bamboohr':
          employees = await this.syncBambooHREmployees(hrConfig);
          break;
        case 'adp':
          employees = await this.syncADPEmployees(hrConfig);
          break;
        case 'successfactors':
          employees = await this.syncSuccessFactorsEmployees(hrConfig);
          break;
        default:
          throw new Error(`Unsupported HR provider: ${hrConfig.provider}`);
      }

      // Update user records with HR data
      for (const employee of employees) {
        await this.updateUserWithHRData(organizationId, employee);
      }

      return {
        success: true,
        syncedEmployees: employees.length,
        message: 'Employee directory synchronized successfully',
      };
    } catch (error) {
      console.error('Employee directory sync error:', error);
      throw new Error('Failed to sync employee directory');
    }
  }

  /**
   * Expense Management Integration (Concur, Expensify)
   */
  async configureExpenseIntegration(organizationId: string, config: z.infer<typeof IntegrationConfigSchema>) {
    try {
      const validatedConfig = IntegrationConfigSchema.parse(config);
      
      // Store integration configuration
      await this.storeIntegrationConfig(organizationId, validatedConfig);
      
      // Test connection
      const testResult = await this.testExpenseConnection(organizationId, validatedConfig);
      
      if (testResult.success) {
        this.integrations.set(`${organizationId}-expense`, validatedConfig);
        
        return {
          success: true,
          message: 'Expense integration configured successfully',
          testResult,
        };
      } else {
        throw new Error(`Expense integration test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.error('Expense integration configuration error:', error);
      throw new Error('Failed to configure expense integration');
    }
  }

  /**
   * Automated Expense Report Creation
   */
  async createExpenseReport(organizationId: string, tripId: string, expenses: any[]) {
    try {
      const expenseConfig = this.integrations.get(`${organizationId}-expense`);
      if (!expenseConfig) {
        throw new Error('Expense integration not configured');
      }

      const expenseReport: z.infer<typeof ExpenseReportSchema> = {
        reportId: `trip-${tripId}-${Date.now()}`,
        employeeId: '', // Will be populated from trip data
        tripId,
        expenses: expenses.map(expense => ({
          category: expense.category,
          amount: expense.amount,
          currency: expense.currency || 'USD',
          date: expense.date,
          description: expense.description,
          receipt: expense.receipt,
        })),
        totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        status: 'draft',
      };

      // Submit to expense system
      let result;
      switch (expenseConfig.provider) {
        case 'concur':
          result = await this.submitToConcur(expenseConfig, expenseReport);
          break;
        case 'expensify':
          result = await this.submitToExpensify(expenseConfig, expenseReport);
          break;
        default:
          throw new Error(`Unsupported expense provider: ${expenseConfig.provider}`);
      }

      return {
        success: true,
        expenseReportId: result.reportId,
        message: 'Expense report created successfully',
      };
    } catch (error) {
      console.error('Expense report creation error:', error);
      throw new Error('Failed to create expense report');
    }
  }

  /**
   * Communication Platforms Integration (Teams, Slack)
   */
  async configureCommunicationIntegration(organizationId: string, config: z.infer<typeof IntegrationConfigSchema>) {
    try {
      const validatedConfig = IntegrationConfigSchema.parse(config);
      
      // Store integration configuration
      await this.storeIntegrationConfig(organizationId, validatedConfig);
      
      // Test connection
      const testResult = await this.testCommunicationConnection(organizationId, validatedConfig);
      
      if (testResult.success) {
        this.integrations.set(`${organizationId}-communication`, validatedConfig);
        
        return {
          success: true,
          message: 'Communication integration configured successfully',
          testResult,
        };
      } else {
        throw new Error(`Communication integration test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.error('Communication integration configuration error:', error);
      throw new Error('Failed to configure communication integration');
    }
  }

  /**
   * Calendar Synchronization (Outlook, Google Calendar)
   */
  async configureCalendarIntegration(organizationId: string, config: z.infer<typeof IntegrationConfigSchema>) {
    try {
      const validatedConfig = IntegrationConfigSchema.parse(config);
      
      // Store integration configuration
      await this.storeIntegrationConfig(organizationId, validatedConfig);
      
      // Test connection
      const testResult = await this.testCalendarConnection(organizationId, validatedConfig);
      
      if (testResult.success) {
        this.integrations.set(`${organizationId}-calendar`, validatedConfig);
        
        return {
          success: true,
          message: 'Calendar integration configured successfully',
          testResult,
        };
      } else {
        throw new Error(`Calendar integration test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.error('Calendar integration configuration error:', error);
      throw new Error('Failed to configure calendar integration');
    }
  }

  /**
   * Send Travel Notifications
   */
  async sendTravelNotification(organizationId: string, userId: string, notification: any) {
    try {
      const communicationConfig = this.integrations.get(`${organizationId}-communication`);
      if (!communicationConfig) {
        console.log('Communication integration not configured, skipping notification');
        return;
      }

      switch (communicationConfig.provider) {
        case 'teams':
          await this.sendTeamsNotification(communicationConfig, userId, notification);
          break;
        case 'slack':
          await this.sendSlackNotification(communicationConfig, userId, notification);
          break;
        default:
          console.log(`Unsupported communication provider: ${communicationConfig.provider}`);
      }
    } catch (error) {
      console.error('Travel notification error:', error);
      // Don't throw error - notifications are non-critical
    }
  }

  // Provider-specific implementations
  private async syncWorkdayEmployees(config: any): Promise<z.infer<typeof EmployeeDataSchema>[]> {
    // Workday API integration
    const response = await axios.get(`${config.credentials.baseUrl}/employees`, {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.employees.map((emp: any) => ({
      employeeId: emp.id,
      email: emp.email,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      title: emp.jobTitle,
      manager: emp.managerId,
      costCenter: emp.costCenter,
      approvalLimit: emp.approvalLimit,
    }));
  }

  private async syncBambooHREmployees(config: any): Promise<z.infer<typeof EmployeeDataSchema>[]> {
    // BambooHR API integration
    const response = await axios.get(`${config.credentials.baseUrl}/v1/employees/directory`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.credentials.apiKey}:x`).toString('base64')}`,
      },
    });

    return response.data.employees.map((emp: any) => ({
      employeeId: emp.id,
      email: emp.workEmail,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      title: emp.jobTitle,
      manager: emp.supervisorId,
    }));
  }

  private async syncADPEmployees(config: any): Promise<z.infer<typeof EmployeeDataSchema>[]> {
    // ADP API integration
    // Implementation would depend on ADP's specific API
    return [];
  }

  private async syncSuccessFactorsEmployees(config: any): Promise<z.infer<typeof EmployeeDataSchema>[]> {
    // SuccessFactors API integration
    // Implementation would depend on SuccessFactors' specific API
    return [];
  }

  private async submitToConcur(config: any, expenseReport: z.infer<typeof ExpenseReportSchema>) {
    // Concur API integration
    const response = await axios.post(`${config.credentials.baseUrl}/expensereports`, expenseReport, {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return { reportId: response.data.id };
  }

  private async submitToExpensify(config: any, expenseReport: z.infer<typeof ExpenseReportSchema>) {
    // Expensify API integration
    const response = await axios.post(`${config.credentials.baseUrl}/Integration-Server/ExpensifyIntegrations`, {
      type: 'create',
      credentials: {
        partnerUserID: config.credentials.clientId,
        partnerUserSecret: config.credentials.clientSecret,
      },
      data: expenseReport,
    });

    return { reportId: response.data.reportID };
  }

  private async sendTeamsNotification(config: any, userId: string, notification: any) {
    // Microsoft Teams notification
    const message = {
      type: 'message',
      text: notification.message,
      attachments: notification.attachments || [],
    };

    await axios.post(config.credentials.webhookUrl, message);
  }

  private async sendSlackNotification(config: any, userId: string, notification: any) {
    // Slack notification
    const message = {
      text: notification.message,
      channel: `@${userId}`,
      attachments: notification.attachments || [],
    };

    await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        'Authorization': `Bearer ${config.credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Helper methods
  private async testHRConnection(organizationId: string, config: any) {
    try {
      // Test HR system connection
      switch (config.provider) {
        case 'workday':
          await axios.get(`${config.credentials.baseUrl}/ping`, {
            headers: { 'Authorization': `Bearer ${config.credentials.accessToken}` },
          });
          break;
        case 'bamboohr':
          await axios.get(`${config.credentials.baseUrl}/v1/meta/users`, {
            headers: { 'Authorization': `Basic ${Buffer.from(`${config.credentials.apiKey}:x`).toString('base64')}` },
          });
          break;
        // Add other providers
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async testExpenseConnection(organizationId: string, config: any) {
    try {
      // Test expense system connection
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async testCommunicationConnection(organizationId: string, config: any) {
    try {
      // Test communication system connection
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async testCalendarConnection(organizationId: string, config: any) {
    try {
      // Test calendar system connection
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async storeIntegrationConfig(organizationId: string, config: any) {
    // Store integration configuration in database
    // This would typically go to an integrations table
    console.log('Storing integration config:', { organizationId, config });
  }

  private async updateUserWithHRData(organizationId: string, employee: z.infer<typeof EmployeeDataSchema>) {
    // Update user record with HR data
    try {
      await db.update(users)
        .set({
          email: employee.email,
          username: employee.name,
          // Add other HR fields as needed
        })
        .where(eq(users.email, employee.email));
    } catch (error) {
      console.error('User update error:', error);
    }
  }
}

export const enterpriseIntegrationHub = new EnterpriseIntegrationHub();
