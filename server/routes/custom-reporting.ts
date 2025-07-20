import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScope';
import { customReportingEngineService } from '../services/customReportingEngine';

const router = express.Router();

// Validation schemas
const CreateReportDefinitionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  type: z.enum(['executive', 'operational', 'compliance', 'financial', 'custom']),
  category: z.enum(['travel', 'expense', 'policy', 'analytics', 'audit']),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean', 'select', 'multiselect']),
    required: z.boolean(),
    defaultValue: z.any().optional(),
    options: z.array(z.object({
      label: z.string(),
      value: z.any()
    })).optional()
  })),
  dataSource: z.object({
    type: z.enum(['database', 'api', 'file', 'integration']),
    connection: z.string(),
    query: z.string(),
    transformations: z.array(z.object({
      type: z.enum(['filter', 'aggregate', 'join', 'calculate', 'format']),
      config: z.record(z.any())
    })),
    caching: z.object({
      enabled: z.boolean(),
      ttl: z.number().positive()
    })
  }),
  visualization: z.object({
    type: z.enum(['table', 'chart', 'dashboard', 'pivot']),
    layout: z.object({
      columns: z.array(z.object({
        field: z.string(),
        label: z.string(),
        type: z.enum(['text', 'number', 'currency', 'date', 'percentage', 'boolean']),
        format: z.string().optional(),
        width: z.number().optional(),
        sortable: z.boolean(),
        filterable: z.boolean(),
        aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional()
      })),
      groupBy: z.array(z.string()).optional(),
      sortBy: z.array(z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc'])
      })).optional()
    }),
    charts: z.array(z.object({
      type: z.enum(['line', 'bar', 'pie', 'scatter', 'area', 'gauge']),
      title: z.string(),
      xAxis: z.string(),
      yAxis: z.union([z.string(), z.array(z.string())]),
      aggregation: z.enum(['sum', 'avg', 'count']).optional()
    })).optional(),
    styling: z.object({
      theme: z.enum(['light', 'dark', 'corporate']),
      colors: z.array(z.string()),
      fonts: z.record(z.string())
    })
  }),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'between']),
    value: z.any(),
    type: z.enum(['user_defined', 'system_default', 'dynamic'])
  })),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
    recipients: z.array(z.string().email()),
    format: z.enum(['pdf', 'excel', 'csv', 'json']),
    enabled: z.boolean()
  }).optional()
});

const UpdateReportDefinitionSchema = CreateReportDefinitionSchema.partial();

const GenerateReportSchema = z.object({
  parameters: z.record(z.any()).optional()
});

const ExportReportSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv', 'json'])
});

const CreateBIIntegrationSchema = z.object({
  provider: z.enum(['tableau', 'powerbi', 'looker', 'qlik', 'sisense']),
  config: z.object({
    serverUrl: z.string().url(),
    credentials: z.record(z.string()),
    datasetId: z.string().optional(),
    workspaceId: z.string().optional()
  })
});

const CreateFromTemplateSchema = z.object({
  templateId: z.string(),
  customizations: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    parameters: z.array(z.any()).optional()
  }).optional()
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

// Report Definition Management

/**
 * @route POST /api/custom-reporting/definitions
 * @desc Create a new report definition
 * @access Private
 */
router.post('/definitions', async (req, res) => {
  try {
    const validatedData = CreateReportDefinitionSchema.parse(req.body);
    
    const definition = await customReportingEngineService.createReportDefinition({
      ...validatedData,
      organizationId: req.organizationId!,
      createdBy: req.user!.id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: definition,
      message: 'Report definition created successfully'
    });
  } catch (error) {
    console.error('Create report definition error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/custom-reporting/definitions
 * @desc Get all report definitions for organization
 * @access Private
 */
router.get('/definitions', async (req, res) => {
  try {
    const definitions = await customReportingEngineService.getReportDefinitions(req.organizationId!);

    res.json({
      success: true,
      data: definitions,
      count: definitions.length
    });
  } catch (error) {
    console.error('Get report definitions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/custom-reporting/definitions/:reportId
 * @desc Get specific report definition
 * @access Private
 */
router.get('/definitions/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const definitions = await customReportingEngineService.getReportDefinitions(req.organizationId!);
    const definition = definitions.find(def => def.id === reportId);

    if (!definition) {
      return res.status(404).json({
        success: false,
        error: 'Report definition not found'
      });
    }

    res.json({
      success: true,
      data: definition
    });
  } catch (error) {
    console.error('Get report definition error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/custom-reporting/definitions/:reportId
 * @desc Update report definition
 * @access Private
 */
router.put('/definitions/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const validatedData = UpdateReportDefinitionSchema.parse(req.body);

    const updatedDefinition = await customReportingEngineService.updateReportDefinition(
      reportId,
      validatedData
    );

    res.json({
      success: true,
      data: updatedDefinition,
      message: 'Report definition updated successfully'
    });
  } catch (error) {
    console.error('Update report definition error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route DELETE /api/custom-reporting/definitions/:reportId
 * @desc Delete report definition
 * @access Private
 */
router.delete('/definitions/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    await customReportingEngineService.deleteReportDefinition(reportId);

    res.json({
      success: true,
      message: 'Report definition deleted successfully'
    });
  } catch (error) {
    console.error('Delete report definition error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Report Generation

/**
 * @route POST /api/custom-reporting/definitions/:reportId/generate
 * @desc Generate a report from definition
 * @access Private
 */
router.post('/definitions/:reportId/generate', async (req, res) => {
  try {
    const { reportId } = req.params;
    const validatedData = GenerateReportSchema.parse(req.body);

    const report = await customReportingEngineService.generateReport(
      reportId,
      validatedData.parameters || {},
      req.user!.id
    );

    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route POST /api/custom-reporting/reports/:reportInstanceId/export
 * @desc Export generated report in specified format
 * @access Private
 */
router.post('/reports/:reportInstanceId/export', async (req, res) => {
  try {
    const { reportInstanceId } = req.params;
    const validatedData = ExportReportSchema.parse(req.body);

    const exportResult = await customReportingEngineService.exportReport(
      reportInstanceId,
      validatedData.format
    );

    res.json({
      success: true,
      data: exportResult,
      message: 'Report exported successfully'
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

// Report Templates

/**
 * @route GET /api/custom-reporting/templates
 * @desc Get available report templates
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await customReportingEngineService.getReportTemplates();

    let filteredTemplates = templates;
    if (category && typeof category === 'string') {
      filteredTemplates = templates.filter(template => template.category === category);
    }

    res.json({
      success: true,
      data: filteredTemplates,
      count: filteredTemplates.length
    });
  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/custom-reporting/templates/:templateId/create-report
 * @desc Create report definition from template
 * @access Private
 */
router.post('/templates/:templateId/create-report', async (req, res) => {
  try {
    const { templateId } = req.params;
    const validatedData = CreateFromTemplateSchema.parse(req.body);

    const definition = await customReportingEngineService.createReportFromTemplate(
      templateId,
      req.organizationId!,
      req.user!.id,
      validatedData.customizations
    );

    res.status(201).json({
      success: true,
      data: definition,
      message: 'Report created from template successfully'
    });
  } catch (error) {
    console.error('Create report from template error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

// BI Tool Integration

/**
 * @route POST /api/custom-reporting/bi-integrations
 * @desc Create BI tool integration
 * @access Private
 */
router.post('/bi-integrations', async (req, res) => {
  try {
    const validatedData = CreateBIIntegrationSchema.parse(req.body);

    const integration = await customReportingEngineService.createBIIntegration(
      req.organizationId!,
      validatedData.provider,
      validatedData.config
    );

    res.status(201).json({
      success: true,
      data: integration,
      message: 'BI integration created successfully'
    });
  } catch (error) {
    console.error('Create BI integration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route POST /api/custom-reporting/definitions/:reportId/sync-to-bi/:integrationId
 * @desc Sync report to BI tool
 * @access Private
 */
router.post('/definitions/:reportId/sync-to-bi/:integrationId', async (req, res) => {
  try {
    const { reportId, integrationId } = req.params;

    const syncResult = await customReportingEngineService.syncReportToBI(reportId, integrationId);

    res.json({
      success: true,
      data: syncResult,
      message: syncResult.success ? 'Report synced to BI tool successfully' : 'Failed to sync report to BI tool'
    });
  } catch (error) {
    console.error('Sync to BI error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Advanced Analytics

/**
 * @route GET /api/custom-reporting/definitions/:reportId/insights
 * @desc Generate AI-powered insights for report
 * @access Private
 */
router.get('/definitions/:reportId/insights', async (req, res) => {
  try {
    const { reportId } = req.params;

    const insights = await customReportingEngineService.generateInsights(reportId);

    res.json({
      success: true,
      data: insights,
      message: 'Insights generated successfully'
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Capabilities and Metadata

/**
 * @route GET /api/custom-reporting/capabilities
 * @desc Get custom reporting engine capabilities
 * @access Private
 */
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      features: [
        "Drag-and-drop report builder",
        "Advanced data visualization",
        "Scheduled report delivery",
        "Real-time data refresh",
        "Custom calculations and formulas",
        "Multi-format export (PDF, Excel, CSV)",
        "BI tool integration",
        "Role-based access control"
      ],
      supportedCharts: ["Line", "Bar", "Pie", "Scatter", "Area", "Gauge", "Heatmap", "Treemap"],
      exportFormats: ["PDF", "Excel", "CSV", "JSON", "PowerPoint"],
      biIntegrations: ["Tableau", "Power BI", "Looker", "Qlik", "Sisense"],
      dataSourceTypes: ["Database", "API", "File Upload", "Integration Hub"],
      schedulingOptions: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]
    };

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Get capabilities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/custom-reporting/health
 * @desc Health check for custom reporting service
 * @access Private
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
          reportGeneration: 'active',
          biIntegration: 'active',
          scheduling: 'active',
          insights: 'active'
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
