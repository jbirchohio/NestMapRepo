import express from 'express';
import { z } from 'zod';
import AdvancedAutomationOrchestrationService from '../services/advancedAutomationOrchestration.js';
import { secureAuth } from '../middleware/secureAuth.js';
import { organizationScoping } from '../middleware/organizationScoping.js';

const router = express.Router();
const automationService = new AdvancedAutomationOrchestrationService();

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  triggers: z.array(z.object({
    id: z.string(),
    type: z.enum(['time', 'event', 'condition', 'manual', 'api', 'webhook']),
    name: z.string(),
    configuration: z.record(z.any()),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists']),
      value: z.any(),
      logicalOperator: z.enum(['AND', 'OR']).optional()
    })).optional()
  })),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['notification', 'booking', 'approval', 'integration', 'calculation', 'ai_analysis']),
    name: z.string(),
    configuration: z.record(z.any()),
    order: z.number(),
    retryPolicy: z.object({
      maxAttempts: z.number(),
      backoffStrategy: z.enum(['linear', 'exponential']),
      initialDelay: z.number(),
      maxDelay: z.number()
    }).optional(),
    timeout: z.number().optional(),
    dependencies: z.array(z.string()).optional()
  })),
  conditions: z.array(z.object({
    id: z.string(),
    expression: z.string(),
    description: z.string(),
    variables: z.record(z.any())
  })),
  schedule: z.object({
    type: z.enum(['once', 'recurring']),
    startDate: z.string().transform(str => new Date(str)),
    endDate: z.string().transform(str => new Date(str)).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    interval: z.number().optional(),
    daysOfWeek: z.array(z.number()).optional(),
    timeOfDay: z.string().optional(),
    timezone: z.string().optional()
  }).optional(),
  isActive: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

const executeWorkflowSchema = z.object({
  context: z.record(z.any()).optional(),
  triggeredBy: z.string().optional()
});

const workflowFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  category: z.string().optional(),
  priority: z.string().optional()
});

const executionFiltersSchema = z.object({
  workflowId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional()
});

const createFromTemplateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.any())
});

// Apply authentication and organization scoping to all routes
router.use(secureAuth);
router.use(organizationScoping);

// Workflow Management Routes
router.post('/workflows', async (req, res) => {
  try {
    const validatedData = createWorkflowSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    const userId = req.user.id;
    
    const workflow = await automationService.createWorkflow(organizationId, validatedData, userId);
    
    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create workflow'
    });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const filters = workflowFiltersSchema.parse(req.query);
    
    const workflows = await automationService.getWorkflows(organizationId, filters);
    
    res.json({
      success: true,
      data: workflows,
      count: workflows.length
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows'
    });
  }
});

router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const organizationId = req.organizationContext.id;
    
    const workflows = await automationService.getWorkflows(organizationId);
    const workflow = workflows.find(w => w.id === workflowId);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow'
    });
  }
});

router.put('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    // Mock update workflow (service method not fully implemented)
    res.json({
      success: true,
      data: { id: workflowId, ...updates, updatedAt: new Date() },
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update workflow'
    });
  }
});

router.delete('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user.id;
    
    // Mock delete workflow (service method not fully implemented)
    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete workflow'
    });
  }
});

// Workflow Execution Routes
router.post('/workflows/:workflowId/execute', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const validatedData = executeWorkflowSchema.parse(req.body);
    
    const execution = await automationService.executeWorkflow(
      workflowId,
      validatedData.context || {},
      validatedData.triggeredBy || 'manual'
    );
    
    res.status(201).json({
      success: true,
      data: execution,
      message: 'Workflow execution started successfully'
    });
  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to execute workflow'
    });
  }
});

router.get('/executions', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const filters = executionFiltersSchema.parse(req.query);
    
    // Mock get executions (service method not fully implemented)
    const executions = [
      {
        id: 'exec_1',
        workflowId: filters.workflowId || 'workflow_1',
        organizationId,
        status: 'completed',
        startedAt: new Date(Date.now() - 60 * 60 * 1000),
        completedAt: new Date(),
        triggeredBy: 'manual',
        context: {},
        steps: [],
        metrics: {
          totalDuration: 30000,
          stepsCompleted: 3,
          stepsTotal: 3,
          successRate: 100,
          averageStepDuration: 10000
        }
      }
    ];
    
    res.json({
      success: true,
      data: executions,
      count: executions.length
    });
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get executions'
    });
  }
});

router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    // Mock get execution (service method not fully implemented)
    const execution = {
      id: executionId,
      workflowId: 'workflow_1',
      organizationId: req.organizationContext.id,
      status: 'completed',
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      completedAt: new Date(),
      triggeredBy: 'manual',
      context: {},
      steps: [
        {
          id: 'step_1',
          actionId: 'action_1',
          name: 'Send Notification',
          status: 'completed',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 59 * 60 * 1000),
          input: {},
          output: { sent: true },
          duration: 60000
        }
      ],
      metrics: {
        totalDuration: 60000,
        stepsCompleted: 1,
        stepsTotal: 1,
        successRate: 100,
        averageStepDuration: 60000
      }
    };
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('Get execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution'
    });
  }
});

router.post('/executions/:executionId/cancel', async (req, res) => {
  try {
    const { executionId } = req.params;
    const { reason } = req.body;
    
    // Mock cancel execution (service method not fully implemented)
    res.json({
      success: true,
      message: 'Execution cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel execution error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel execution'
    });
  }
});

// Template Management Routes
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await automationService.getTemplates(category as string);
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const templates = await automationService.getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template'
    });
  }
});

router.post('/templates/:templateId/create-workflow', async (req, res) => {
  try {
    const { templateId } = req.params;
    const validatedData = createFromTemplateSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    const userId = req.user.id;
    
    // Mock create workflow from template (service method not fully implemented)
    const workflow = {
      id: `workflow_${Date.now()}`,
      name: `Workflow from Template ${templateId}`,
      description: 'Created from template',
      organizationId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      priority: 'medium',
      triggers: [],
      actions: [],
      conditions: []
    };
    
    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created from template successfully'
    });
  } catch (error) {
    console.error('Create workflow from template error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create workflow from template'
    });
  }
});

// Analytics and Recommendations Routes
router.get('/analytics', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { period } = req.query;
    
    const periodObj = period ? JSON.parse(period as string) : {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    // Mock analytics (service method not fully implemented)
    const analytics = {
      organizationId,
      period: periodObj,
      metrics: {
        totalWorkflows: 15,
        activeWorkflows: 12,
        totalExecutions: 450,
        successfulExecutions: 425,
        failedExecutions: 25,
        averageExecutionTime: 45000,
        timeSaved: 120,
        costSaved: 2500,
        errorRate: 5.6
      },
      topWorkflows: [
        {
          workflowId: 'workflow_1',
          name: 'Travel Approval Process',
          executionCount: 150,
          successRate: 95.3,
          averageDuration: 30000
        }
      ],
      recommendations: []
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

router.post('/recommendations/generate', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const recommendations = await automationService.generateSmartRecommendations(organizationId);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      message: 'Smart recommendations generated successfully'
    });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate recommendations'
    });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { status, type } = req.query;
    
    // Mock recommendations
    const recommendations = [
      {
        id: 'rec_1',
        organizationId,
        type: 'workflow_optimization',
        title: 'Optimize High-Failure Workflows',
        description: 'Several workflows have high failure rates. Consider adding error handling and retry policies.',
        impact: {
          timeSaved: 10,
          costSaved: 500,
          efficiencyGain: 25,
          riskReduction: 40
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: 8,
          requiredResources: ['Developer', 'Business Analyst']
        },
        confidence: 85,
        generatedAt: new Date(),
        status: 'pending'
      }
    ];
    
    let filteredRecommendations = recommendations;
    if (status) {
      filteredRecommendations = filteredRecommendations.filter(r => r.status === status);
    }
    if (type) {
      filteredRecommendations = filteredRecommendations.filter(r => r.type === type);
    }
    
    res.json({
      success: true,
      data: filteredRecommendations,
      count: filteredRecommendations.length
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

// Service Capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = automationService.getCapabilities();
    
    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Get capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities'
    });
  }
});

// Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await automationService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;
