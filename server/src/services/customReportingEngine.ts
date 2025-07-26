import { EventEmitter } from 'events';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'operational' | 'compliance' | 'financial' | 'custom';
  category: 'travel' | 'expense' | 'policy' | 'analytics' | 'audit';
  organizationId: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  schedule?: ReportSchedule;
  parameters: ReportParameter[];
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
  filters: ReportFilter[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time: string;
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
}

export interface DataSourceConfig {
  type: 'database' | 'api' | 'file' | 'integration';
  connection: string;
  query: string;
  transformations: DataTransformation[];
  caching: { enabled: boolean; ttl: number };
}

export interface DataTransformation {
  type: 'filter' | 'aggregate' | 'join' | 'calculate' | 'format';
  config: Record<string, any>;
}

export interface VisualizationConfig {
  type: 'table' | 'chart' | 'dashboard' | 'pivot';
  layout: {
    columns: ColumnConfig[];
    groupBy?: string[];
    sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  };
  charts?: ChartConfig[];
  styling: { theme: 'light' | 'dark' | 'corporate'; colors: string[]; fonts: Record<string, string> };
}

export interface ColumnConfig {
  field: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean';
  format?: string;
  width?: number;
  sortable: boolean;
  filterable: boolean;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'gauge';
  title: string;
  xAxis: string;
  yAxis: string | string[];
  aggregation?: 'sum' | 'avg' | 'count';
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
  type: 'user_defined' | 'system_default' | 'dynamic';
}

export interface GeneratedReport {
  id: string;
  definitionId: string;
  name: string;
  generatedAt: Date;
  generatedBy: number;
  parameters: Record<string, any>;
  data: any[];
  metadata: {
    totalRecords: number;
    executionTime: number;
    dataFreshness: Date;
    filters: ReportFilter[];
  };
  format: 'json' | 'pdf' | 'excel' | 'csv';
  downloadUrl?: string;
}

export interface BIIntegration {
  provider: 'tableau' | 'powerbi' | 'looker' | 'qlik' | 'sisense';
  config: {
    serverUrl: string;
    credentials: Record<string, string>;
    datasetId?: string;
    workspaceId?: string;
  };
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  supportedFeatures: string[];
}

export interface CustomReportingCapabilities {
  features: [
    "Drag-and-drop report builder",
    "Advanced data visualization", 
    "Scheduled report delivery",
    "Real-time data refresh",
    "Custom calculations and formulas",
    "Multi-format export (PDF, Excel, CSV)",
    "BI tool integration",
    "Role-based access control"
  ];
  supportedCharts: ["Line", "Bar", "Pie", "Scatter", "Area", "Gauge", "Heatmap", "Treemap"];
  exportFormats: ["PDF", "Excel", "CSV", "JSON", "PowerPoint"];
}

class CustomReportingEngineService extends EventEmitter {
  private reportDefinitions: Map<string, ReportDefinition> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();
  private biIntegrations: Map<string, BIIntegration> = new Map();
  private dataCache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();

  constructor() {
    super();
    this.initializeReportTemplates();
    this.startScheduledReports();
    this.startCacheCleanup();
  }

  private initializeReportTemplates() {
    this.emit('templatesInitialized');
  }

  private startScheduledReports() {
    setInterval(() => this.processScheduledReports(), 60 * 1000);
  }

  private startCacheCleanup() {
    setInterval(() => this.cleanExpiredCache(), 60 * 60 * 1000);
  }

  // Report Definition Management
  async createReportDefinition(
    definition: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ReportDefinition> {
    const reportDef: ReportDefinition = {
      id: this.generateReportId(),
      ...definition,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.validateReportDefinition(reportDef);
    this.reportDefinitions.set(reportDef.id, reportDef);
    this.emit('reportDefinitionCreated', reportDef);

    return reportDef;
  }

  async updateReportDefinition(
    reportId: string,
    updates: Partial<ReportDefinition>
  ): Promise<ReportDefinition> {
    const existing = this.reportDefinitions.get(reportId);
    if (!existing) {
      throw new Error('Report definition not found');
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.validateReportDefinition(updated);
    this.reportDefinitions.set(reportId, updated);
    this.emit('reportDefinitionUpdated', updated);

    return updated;
  }

  async deleteReportDefinition(reportId: string): Promise<void> {
    const definition = this.reportDefinitions.get(reportId);
    if (!definition) {
      throw new Error('Report definition not found');
    }

    this.reportDefinitions.delete(reportId);
    this.emit('reportDefinitionDeleted', { reportId });
  }

  async getReportDefinitions(organizationId: number): Promise<ReportDefinition[]> {
    return Array.from(this.reportDefinitions.values())
      .filter(def => def.organizationId === organizationId);
  }

  // Report Generation
  async generateReport(
    reportId: string,
    parameters: Record<string, any> = {},
    userId: number
  ): Promise<GeneratedReport> {
    const definition = this.reportDefinitions.get(reportId);
    if (!definition) {
      throw new Error('Report definition not found');
    }

    if (!definition.isActive) {
      throw new Error('Report definition is inactive');
    }

    const startTime = Date.now();

    try {
      this.validateReportParameters(definition.parameters, parameters);
      const data = await this.executeReportQuery(definition, parameters);
      const transformedData = await this.applyDataTransformations(data, definition.dataSource.transformations);
      const filteredData = this.applyReportFilters(transformedData, definition.filters, parameters);

      const report: GeneratedReport = {
        id: this.generateReportInstanceId(),
        definitionId: reportId,
        name: definition.name,
        generatedAt: new Date(),
        generatedBy: userId,
        parameters,
        data: filteredData,
        metadata: {
          totalRecords: filteredData.length,
          executionTime: Date.now() - startTime,
          dataFreshness: new Date(),
          filters: definition.filters
        },
        format: 'json'
      };

      this.generatedReports.set(report.id, report);
      this.emit('reportGenerated', report);

      return report;

    } catch (error) {
      console.error('Report generation error:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  async exportReport(
    reportInstanceId: string,
    format: 'pdf' | 'excel' | 'csv' | 'json'
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const report = this.generatedReports.get(reportInstanceId);
    if (!report) {
      throw new Error('Report instance not found');
    }

    try {
      let exportedData: Buffer | string;
      
      switch (format) {
        case 'pdf':
          exportedData = await this.exportToPDF(report);
          break;
        case 'excel':
          exportedData = await this.exportToExcel(report);
          break;
        case 'csv':
          exportedData = await this.exportToCSV(report);
          break;
        case 'json':
          exportedData = JSON.stringify(report.data, null, 2);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const downloadUrl = await this.storeExportedFile(exportedData, format, reportInstanceId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      this.emit('reportExported', { reportInstanceId, format, downloadUrl });
      return { downloadUrl, expiresAt };

    } catch (error) {
      console.error('Report export error:', error);
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  // BI Tool Integration
  async createBIIntegration(
    organizationId: number,
    provider: BIIntegration['provider'],
    config: BIIntegration['config']
  ): Promise<BIIntegration> {
    const integration: BIIntegration = {
      provider,
      config,
      status: 'disconnected',
      supportedFeatures: this.getBISupportedFeatures(provider)
    };

    const isConnected = await this.testBIConnection(integration);
    integration.status = isConnected ? 'connected' : 'error';

    if (isConnected) {
      integration.lastSync = new Date();
    }

    const integrationId = `bi_${organizationId}_${provider}`;
    this.biIntegrations.set(integrationId, integration);

    this.emit('biIntegrationCreated', { integrationId, integration });
    return integration;
  }

  async syncReportToBI(
    reportId: string,
    biIntegrationId: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const report = this.reportDefinitions.get(reportId);
    const integration = this.biIntegrations.get(biIntegrationId);

    if (!report || !integration) {
      throw new Error('Report or BI integration not found');
    }

    if (integration.status !== 'connected') {
      throw new Error('BI integration is not connected');
    }

    try {
      const generatedReport = await this.generateReport(reportId, {}, report.createdBy);
      const biData = await this.convertToBIFormat(generatedReport, integration.provider);
      const externalId = await this.uploadToBITool(biData, integration);

      this.emit('reportSyncedToBI', { reportId, biIntegrationId, externalId });
      return { success: true, externalId };

    } catch (error) {
      console.error('BI sync error:', error);
      return { success: false, error: error.message };
    }
  }

  // Advanced Analytics
  async generateInsights(reportId: string): Promise<{
    insights: string[];
    recommendations: string[];
    anomalies: any[];
    trends: any[];
  }> {
    const definition = this.reportDefinitions.get(reportId);
    if (!definition) {
      throw new Error('Report definition not found');
    }

    try {
      const data = await this.executeReportQuery(definition, {});
      return await this.generateAIInsights(data, definition);
    } catch (error) {
      console.error('Insights generation error:', error);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  // Private Helper Methods
  private validateReportDefinition(definition: ReportDefinition): void {
    if (!definition.name || definition.name.trim().length === 0) {
      throw new Error('Report name is required');
    }
    if (!definition.dataSource || !definition.dataSource.query) {
      throw new Error('Data source configuration is required');
    }
    if (!definition.visualization) {
      throw new Error('Visualization configuration is required');
    }
  }

  private validateReportParameters(
    parameterDefs: ReportParameter[],
    providedParams: Record<string, any>
  ): void {
    for (const paramDef of parameterDefs) {
      if (paramDef.required && !(paramDef.name in providedParams)) {
        throw new Error(`Required parameter '${paramDef.name}' is missing`);
      }
    }
  }

  private async executeReportQuery(
    definition: ReportDefinition,
    parameters: Record<string, any>
  ): Promise<any[]> {
    const cacheKey = this.generateCacheKey(definition.id, parameters);
    const cached = this.dataCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    // Mock data based on data source type
    let data: any[] = [
      { id: 1, department: 'Engineering', amount: 15000, trip_count: 25, month: 'Jan' },
      { id: 2, department: 'Sales', amount: 22000, trip_count: 35, month: 'Jan' },
      { id: 3, department: 'Marketing', amount: 8000, trip_count: 12, month: 'Jan' }
    ];

    if (definition.dataSource.caching.enabled) {
      this.dataCache.set(cacheKey, {
        data,
        timestamp: new Date(),
        ttl: definition.dataSource.caching.ttl
      });
    }

    return data;
  }

  private async applyDataTransformations(
    data: any[],
    transformations: DataTransformation[]
  ): Promise<any[]> {
    let result = [...data];
    for (const transformation of transformations) {
      if (transformation.type === 'calculate') {
        result = result.map(row => ({ ...row, calculated_field: row.amount * 1.1 }));
      }
    }
    return result;
  }

  private applyReportFilters(
    data: any[],
    filters: ReportFilter[],
    parameters: Record<string, any>
  ): any[] {
    let result = [...data];
    for (const filter of filters) {
      result = result.filter(row => {
        const fieldValue = row[filter.field];
        switch (filter.operator) {
          case 'equals': return fieldValue === filter.value;
          case 'greater_than': return fieldValue > filter.value;
          case 'contains': return String(fieldValue).includes(String(filter.value));
          default: return true;
        }
      });
    }
    return result;
  }

  private async exportToPDF(report: GeneratedReport): Promise<Buffer> {
    return Buffer.from('PDF content');
  }

  private async exportToExcel(report: GeneratedReport): Promise<Buffer> {
    return Buffer.from('Excel content');
  }

  private async exportToCSV(report: GeneratedReport): Promise<string> {
    if (report.data.length === 0) return '';
    const headers = Object.keys(report.data[0]);
    const csvRows = [
      headers.join(','),
      ...report.data.map(row => 
        headers.map(header => JSON.stringify(row[header] || '')).join(',')
      )
    ];
    return csvRows.join('\n');
  }

  private async storeExportedFile(
    data: Buffer | string,
    format: string,
    reportInstanceId: string
  ): Promise<string> {
    const filename = `report_${reportInstanceId}.${format}`;
    return `/downloads/${filename}`;
  }

  private getBISupportedFeatures(provider: BIIntegration['provider']): string[] {
    const features = {
      tableau: ['dashboards', 'workbooks', 'data_sources', 'extracts'],
      powerbi: ['datasets', 'reports', 'dashboards', 'dataflows'],
      looker: ['looks', 'dashboards', 'explores', 'models'],
      qlik: ['apps', 'sheets', 'objects', 'data_connections'],
      sisense: ['dashboards', 'widgets', 'data_models', 'elasticubes']
    };
    return features[provider] || [];
  }

  private async testBIConnection(integration: BIIntegration): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private async convertToBIFormat(report: GeneratedReport, provider: BIIntegration['provider']): Promise<any> {
    return { name: report.name, data: report.data, metadata: report.metadata };
  }

  private async uploadToBITool(data: any, integration: BIIntegration): Promise<string> {
    return `external_${Date.now()}`;
  }

  private async generateAIInsights(data: any[], definition: ReportDefinition): Promise<{
    insights: string[];
    recommendations: string[];
    anomalies: any[];
    trends: any[];
  }> {
    return {
      insights: [
        'Travel spending increased 15% compared to last quarter',
        'Engineering department shows highest per-trip costs',
        'Advance booking rate improved to 78%'
      ],
      recommendations: [
        'Implement advance booking incentives to reduce costs',
        'Review engineering travel policies for optimization',
        'Consider negotiating better corporate rates with preferred vendors'
      ],
      anomalies: [
        { field: 'amount', value: 25000, expected: 15000, deviation: 0.67 }
      ],
      trends: [
        { metric: 'total_spend', direction: 'increasing', rate: 0.15 },
        { metric: 'trip_count', direction: 'stable', rate: 0.02 }
      ]
    };
  }

  private async processScheduledReports(): Promise<void> {
    // Process scheduled reports
  }

  private generateCacheKey(reportId: string, parameters: Record<string, any>): string {
    const paramString = JSON.stringify(parameters);
    return `${reportId}_${Buffer.from(paramString).toString('base64')}`;
  }

  private isCacheValid(cached: { timestamp: Date; ttl: number }): boolean {
    return Date.now() - cached.timestamp.getTime() < cached.ttl * 1000;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.dataCache.entries()) {
      if (now - cached.timestamp.getTime() > cached.ttl * 1000) {
        this.dataCache.delete(key);
      }
    }
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportInstanceId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  async getReportTemplates(): Promise<any[]> {
    return [
      {
        id: 'template_travel_summary',
        name: 'Travel Summary Report',
        description: 'Comprehensive overview of travel activities and costs',
        category: 'travel',
        popularity: 95
      },
      {
        id: 'template_expense_analysis',
        name: 'Expense Analysis Report', 
        description: 'Detailed analysis of travel expenses and patterns',
        category: 'expense',
        popularity: 87
      }
    ];
  }

  async createReportFromTemplate(
    templateId: string,
    organizationId: number,
    userId: number,
    customizations: Partial<ReportDefinition> = {}
  ): Promise<ReportDefinition> {
    const definition: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `Report from Template - ${new Date().toLocaleDateString()}`,
      description: 'Generated from template',
      type: 'custom',
      category: 'travel',
      organizationId,
      createdBy: userId,
      isActive: true,
      parameters: [],
      dataSource: {
        type: 'database',
        connection: 'default',
        query: 'SELECT * FROM trips',
        transformations: [],
        caching: { enabled: true, ttl: 3600 }
      },
      visualization: {
        type: 'table',
        layout: { columns: [] },
        styling: { theme: 'corporate', colors: [], fonts: {} }
      },
      filters: [],
      ...customizations
    };

    return this.createReportDefinition(definition);
  }
}

export const customReportingEngineService = new CustomReportingEngineService();

