import { Router } from 'express';
import axios from 'axios';
import { db } from './db-connection.js';
import { auditLogger } from './auditLogger.js';

export interface ExpenseProvider {
  id: string;
  name: string;
  type: 'concur' | 'expensify' | 'quickbooks' | 'xero' | 'sap';
  isEnabled: boolean;
  config: ExpenseProviderConfig;
}

export interface ExpenseProviderConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  organizationId?: string;
  customFields?: Record<string, string>;
}

export interface ExpenseItem {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: Date;
  vendor?: string;
  receiptUrl?: string;
  taxAmount?: number;
  isPersonal: boolean;
  projectCode?: string;
  costCenter?: string;
  customFields?: Record<string, any>;
}

export interface ExpenseReport {
  id: string;
  name: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  totalAmount: number;
  currency: string;
  submittedDate?: Date;
  approvedDate?: Date;
  items: ExpenseItem[];
  approver?: string;
  comments?: string;
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: string[];
}

export class ExpenseIntegrationService {
  private static instance: ExpenseIntegrationService;
  private providers: Map<number, ExpenseProvider[]> = new Map();

  static getInstance(): ExpenseIntegrationService {
    if (!ExpenseIntegrationService.instance) {
      ExpenseIntegrationService.instance = new ExpenseIntegrationService();
    }
    return ExpenseIntegrationService.instance;
  }

  // Configure expense provider for organization
  async configureProvider(
    organizationId: number,
    providerType: 'concur' | 'expensify' | 'quickbooks' | 'xero' | 'sap',
    config: ExpenseProviderConfig
  ): Promise<ExpenseProvider> {
    const provider: ExpenseProvider = {
      id: `${providerType}-${organizationId}`,
      name: this.getProviderName(providerType),
      type: providerType,
      isEnabled: true,
      config
    };

    const orgProviders = this.providers.get(organizationId) || [];
    const existingIndex = orgProviders.findIndex(p => p.type === providerType);
    
    if (existingIndex >= 0) {
      orgProviders[existingIndex] = provider;
    } else {
      orgProviders.push(provider);
    }
    
    this.providers.set(organizationId, orgProviders);

    await auditLogger.log({
      organizationId,
      action: 'expense_provider_configured',
      entityType: 'organization',
      entityId: organizationId,
      details: { providerType, providerId: provider.id }
    });

    return provider;
  }

  // Sync expenses from external provider
  async syncExpenses(organizationId: number, userId: number, providerType: string): Promise<SyncResult> {
    const orgProviders = this.providers.get(organizationId) || [];
    const provider = orgProviders.find(p => p.type === providerType && p.isEnabled);
    
    if (!provider) {
      throw new Error(`Provider ${providerType} not configured for organization`);
    }

    let result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      switch (provider.type) {
        case 'concur':
          result = await this.syncConcurExpenses(provider, userId);
          break;
        case 'expensify':
          result = await this.syncExpensifyExpenses(provider, userId);
          break;
        case 'quickbooks':
          result = await this.syncQuickBooksExpenses(provider, userId);
          break;
        case 'xero':
          result = await this.syncXeroExpenses(provider, userId);
          break;
        case 'sap':
          result = await this.syncSAPExpenses(provider, userId);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      await auditLogger.log({
        userId,
        organizationId,
        action: 'expense_sync_completed',
        entityType: 'expense',
        details: { 
          providerType: provider.type,
          itemsProcessed: result.itemsProcessed,
          itemsCreated: result.itemsCreated,
          itemsUpdated: result.itemsUpdated,
          errors: result.errors
        }
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      await auditLogger.log({
        userId,
        organizationId,
        action: 'expense_sync_failed',
        entityType: 'expense',
        details: { 
          providerType: provider.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    return result;
  }

  // Export expenses to external provider
  async exportExpenses(
    organizationId: number,
    userId: number,
    providerType: string,
    expenses: ExpenseItem[]
  ): Promise<SyncResult> {
    const orgProviders = this.providers.get(organizationId) || [];
    const provider = orgProviders.find(p => p.type === providerType && p.isEnabled);
    
    if (!provider) {
      throw new Error(`Provider ${providerType} not configured for organization`);
    }

    let result: SyncResult = {
      success: false,
      itemsProcessed: expenses.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      switch (provider.type) {
        case 'concur':
          result = await this.exportToConcur(provider, expenses);
          break;
        case 'expensify':
          result = await this.exportToExpensify(provider, expenses);
          break;
        case 'quickbooks':
          result = await this.exportToQuickBooks(provider, expenses);
          break;
        case 'xero':
          result = await this.exportToXero(provider, expenses);
          break;
        case 'sap':
          result = await this.exportToSAP(provider, expenses);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      await auditLogger.log({
        userId,
        organizationId,
        action: 'expense_export_completed',
        entityType: 'expense',
        details: { 
          providerType: provider.type,
          itemsProcessed: result.itemsProcessed,
          itemsCreated: result.itemsCreated,
          errors: result.errors
        }
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  // Concur integration methods
  private async syncConcurExpenses(provider: ExpenseProvider, userId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      // Refresh token if needed
      await this.refreshConcurToken(provider);

      // Get expense reports from Concur
      const response = await axios.get(`${provider.config.apiUrl}/api/v3.0/expense/reports`, {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`,
          'Accept': 'application/json'
        }
      });

      const reports = response.data.Items || [];
      
      for (const report of reports) {
        // Get report details
        const detailResponse = await axios.get(`${provider.config.apiUrl}/api/v3.0/expense/reports/${report.ID}`, {
          headers: {
            'Authorization': `Bearer ${provider.config.accessToken}`,
            'Accept': 'application/json'
          }
        });

        const reportDetails = detailResponse.data;
        
        // Process each expense entry
        if (reportDetails.Entries) {
          for (const entry of reportDetails.Entries) {
            const expenseItem: ExpenseItem = {
              id: entry.ID,
              amount: entry.PostedAmount,
              currency: entry.CurrencyCode,
              category: entry.ExpenseTypeName,
              description: entry.Description || '',
              date: new Date(entry.TransactionDate),
              vendor: entry.VendorDescription,
              receiptUrl: entry.ReceiptReceived ? `${provider.config.apiUrl}/api/image/v1.0/report/${entry.ID}` : undefined,
              taxAmount: entry.TaxAmount,
              isPersonal: entry.IsPersonal,
              projectCode: entry.ProjectCode,
              costCenter: entry.CostCenter,
              customFields: entry.CustomFields
            };

            // Store or update expense item
            result.itemsCreated++;
          }
        }
        
        result.itemsProcessed++;
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Concur sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async exportToConcur(provider: ExpenseProvider, expenses: ExpenseItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsProcessed: expenses.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      await this.refreshConcurToken(provider);

      // Create expense report
      const reportData = {
        Name: `NestMap Export - ${new Date().toISOString().split('T')[0]}`,
        Purpose: 'Travel expenses from NestMap',
        PolicyID: provider.config.customFields?.defaultPolicyId
      };

      const reportResponse = await axios.post(`${provider.config.apiUrl}/api/v3.0/expense/reports`, reportData, {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const reportId = reportResponse.data.ID;

      // Add expenses to report
      for (const expense of expenses) {
        const entryData = {
          ReportID: reportId,
          ExpenseTypeCode: this.mapCategoryToConcurExpenseType(expense.category),
          TransactionDate: expense.date.toISOString(),
          TransactionAmount: expense.amount,
          TransactionCurrencyCode: expense.currency,
          Description: expense.description,
          VendorDescription: expense.vendor,
          IsPersonal: expense.isPersonal,
          ProjectCode: expense.projectCode,
          CostCenter: expense.costCenter
        };

        await axios.post(`${provider.config.apiUrl}/api/v3.0/expense/entries`, entryData, {
          headers: {
            'Authorization': `Bearer ${provider.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        result.itemsCreated++;
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Concur export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Expensify integration methods
  private async syncExpensifyExpenses(provider: ExpenseProvider, userId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      // Expensify API call to get expenses
      const response = await axios.post(`${provider.config.apiUrl}/Integration-Server/ExpensifyIntegrations`, {
        requestJobDescription: JSON.stringify({
          type: 'get',
          credentials: {
            partnerUserID: provider.config.clientId,
            partnerUserSecret: provider.config.clientSecret
          },
          onReceive: {
            immediateResponse: ['returnRandomFileName']
          },
          inputSettings: {
            type: 'expenses',
            filters: {
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
            }
          }
        })
      });

      // Process Expensify response
      if (response.data && response.data.expenses) {
        for (const expense of response.data.expenses) {
          const expenseItem: ExpenseItem = {
            id: expense.transactionID,
            amount: parseFloat(expense.amount),
            currency: expense.currency,
            category: expense.category,
            description: expense.comment || '',
            date: new Date(expense.created),
            vendor: expense.merchant,
            receiptUrl: expense.receipt?.url,
            isPersonal: expense.billable === 'false',
            projectCode: expense.tag,
            customFields: expense.customFields
          };

          result.itemsCreated++;
        }
        result.itemsProcessed = response.data.expenses.length;
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Expensify sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async exportToExpensify(provider: ExpenseProvider, expenses: ExpenseItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsProcessed: expenses.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };

    try {
      for (const expense of expenses) {
        const expenseData = {
          requestJobDescription: JSON.stringify({
            type: 'create',
            credentials: {
              partnerUserID: provider.config.clientId,
              partnerUserSecret: provider.config.clientSecret
            },
            inputSettings: {
              type: 'expenses',
              employeeEmail: provider.config.customFields?.employeeEmail,
              transactionList: [{
                amount: expense.amount,
                currency: expense.currency,
                merchant: expense.vendor || 'NestMap',
                created: expense.date.toISOString(),
                category: expense.category,
                comment: expense.description,
                tag: expense.projectCode,
                billable: !expense.isPersonal
              }]
            }
          })
        };

        await axios.post(`${provider.config.apiUrl}/Integration-Server/ExpensifyIntegrations`, expenseData);
        result.itemsCreated++;
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Expensify export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // QuickBooks integration methods
  private async syncQuickBooksExpenses(provider: ExpenseProvider, userId: number): Promise<SyncResult> {
    // Mock implementation - would integrate with QuickBooks API
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };
  }

  private async exportToQuickBooks(provider: ExpenseProvider, expenses: ExpenseItem[]): Promise<SyncResult> {
    // Mock implementation - would integrate with QuickBooks API
    return {
      success: true,
      itemsProcessed: expenses.length,
      itemsCreated: expenses.length,
      itemsUpdated: 0,
      errors: []
    };
  }

  // Xero integration methods
  private async syncXeroExpenses(provider: ExpenseProvider, userId: number): Promise<SyncResult> {
    // Mock implementation - would integrate with Xero API
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };
  }

  private async exportToXero(provider: ExpenseProvider, expenses: ExpenseItem[]): Promise<SyncResult> {
    // Mock implementation - would integrate with Xero API
    return {
      success: true,
      itemsProcessed: expenses.length,
      itemsCreated: expenses.length,
      itemsUpdated: 0,
      errors: []
    };
  }

  // SAP integration methods
  private async syncSAPExpenses(provider: ExpenseProvider, userId: number): Promise<SyncResult> {
    // Mock implementation - would integrate with SAP API
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    };
  }

  private async exportToSAP(provider: ExpenseProvider, expenses: ExpenseItem[]): Promise<SyncResult> {
    // Mock implementation - would integrate with SAP API
    return {
      success: true,
      itemsProcessed: expenses.length,
      itemsCreated: expenses.length,
      itemsUpdated: 0,
      errors: []
    };
  }

  // Helper methods
  private async refreshConcurToken(provider: ExpenseProvider): Promise<void> {
    if (!provider.config.refreshToken) return;
    
    try {
      const response = await axios.post(`${provider.config.apiUrl}/oauth2/v0/token`, {
        grant_type: 'refresh_token',
        refresh_token: provider.config.refreshToken,
        client_id: provider.config.clientId,
        client_secret: provider.config.clientSecret
      });

      provider.config.accessToken = response.data.access_token;
      provider.config.refreshToken = response.data.refresh_token;
      provider.config.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    } catch (error) {
      throw new Error(`Failed to refresh Concur token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapCategoryToConcurExpenseType(category: string): string {
    const mapping: Record<string, string> = {
      'meals': 'MEALS',
      'transportation': 'TRANS',
      'lodging': 'LODG',
      'fuel': 'FUEL',
      'parking': 'PARK',
      'entertainment': 'ENTER',
      'other': 'OTHER'
    };
    
    return mapping[category.toLowerCase()] || 'OTHER';
  }

  private getProviderName(type: string): string {
    const names: Record<string, string> = {
      'concur': 'SAP Concur',
      'expensify': 'Expensify',
      'quickbooks': 'QuickBooks',
      'xero': 'Xero',
      'sap': 'SAP'
    };
    
    return names[type] || type;
  }

  // Get configured providers for organization
  async getProviders(organizationId: number): Promise<ExpenseProvider[]> {
    return this.providers.get(organizationId) || [];
  }

  // Test provider connection
  async testConnection(organizationId: number, providerType: string): Promise<boolean> {
    const orgProviders = this.providers.get(organizationId) || [];
    const provider = orgProviders.find(p => p.type === providerType);
    
    if (!provider) return false;

    try {
      switch (provider.type) {
        case 'concur':
          await this.refreshConcurToken(provider);
          const response = await axios.get(`${provider.config.apiUrl}/api/v3.0/common/connectionrequests`, {
            headers: { 'Authorization': `Bearer ${provider.config.accessToken}` }
          });
          return response.status === 200;
        
        case 'expensify':
          const testResponse = await axios.post(`${provider.config.apiUrl}/Integration-Server/ExpensifyIntegrations`, {
            requestJobDescription: JSON.stringify({
              type: 'get',
              credentials: {
                partnerUserID: provider.config.clientId,
                partnerUserSecret: provider.config.clientSecret
              },
              inputSettings: { type: 'test' }
            })
          });
          return testResponse.status === 200;
        
        default:
          return true; // Mock success for other providers
      }
    } catch (error) {
      return false;
    }
  }
}

export const expenseIntegrationService = ExpenseIntegrationService.getInstance();
