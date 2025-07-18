import express from 'express';
import { PolicyEngine } from '../policyEngine';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLogger } from '../auditLogger';

const router = express.Router();
const policyEngine = PolicyEngine.getInstance();

// Get all policy rules
router.get('/rules', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { type, enabled } = req.query;
    
    const rules = await policyEngine.getPolicyRules(organizationId, {
      type: type as string,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined
    });

    await auditLogger.log({
      action: 'policy_rules_viewed',
      userId: req.user.id,
      organizationId,
      details: { 
        filters: { type, enabled },
        ruleCount: rules.length 
      }
    });

    res.json(rules);
  } catch (error) {
    console.error('Error fetching policy rules:', error);
    res.status(500).json({ error: 'Failed to fetch policy rules' });
  }
});

// Create policy rule
router.post('/rules', requireAuth, requireRole(['admin', 'policy_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const ruleData = req.body;

    const rule = await policyEngine.createPolicyRule(organizationId, ruleData);

    await auditLogger.log({
      action: 'policy_rule_created',
      userId: req.user.id,
      organizationId,
      details: { ruleId: rule.id, ruleName: rule.name, ruleType: rule.type }
    });

    res.json(rule);
  } catch (error) {
    console.error('Error creating policy rule:', error);
    res.status(500).json({ error: 'Failed to create policy rule' });
  }
});

// Update policy rule
router.patch('/rules/:ruleId', requireAuth, requireRole(['admin', 'policy_manager']), async (req, res) => {
  try {
    const { ruleId } = req.params;
    const organizationId = req.user.organizationId;
    const updates = req.body;

    const rule = await policyEngine.updatePolicyRule(ruleId, updates);

    await auditLogger.log({
      action: 'policy_rule_updated',
      userId: req.user.id,
      organizationId,
      details: { ruleId, updates }
    });

    res.json(rule);
  } catch (error) {
    console.error('Error updating policy rule:', error);
    res.status(500).json({ error: 'Failed to update policy rule' });
  }
});

// Delete policy rule
router.delete('/rules/:ruleId', requireAuth, requireRole(['admin', 'policy_manager']), async (req, res) => {
  try {
    const { ruleId } = req.params;
    const organizationId = req.user.organizationId;

    await policyEngine.deletePolicyRule(ruleId);

    await auditLogger.log({
      action: 'policy_rule_deleted',
      userId: req.user.id,
      organizationId,
      details: { ruleId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting policy rule:', error);
    res.status(500).json({ error: 'Failed to delete policy rule' });
  }
});

// Test policy rule
router.post('/rules/:ruleId/test', requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { testData } = req.body;
    const organizationId = req.user.organizationId;

    const result = await policyEngine.testPolicyRule(ruleId, testData);

    await auditLogger.log({
      action: 'policy_rule_tested',
      userId: req.user.id,
      organizationId,
      details: { ruleId, testResult: result }
    });

    res.json(result);
  } catch (error) {
    console.error('Error testing policy rule:', error);
    res.status(500).json({ error: 'Failed to test policy rule' });
  }
});

// Get policy templates
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const templates = await policyEngine.getPolicyTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching policy templates:', error);
    res.status(500).json({ error: 'Failed to fetch policy templates' });
  }
});

// Import policy template
router.post('/templates/:templateId/import', requireAuth, requireRole(['admin', 'policy_manager']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organizationId;
    const { customizations } = req.body;

    const importedRules = await policyEngine.importPolicyTemplate(
      organizationId,
      templateId,
      customizations
    );

    await auditLogger.log({
      action: 'policy_template_imported',
      userId: req.user.id,
      organizationId,
      details: { templateId, importedRuleCount: importedRules.length }
    });

    res.json(importedRules);
  } catch (error) {
    console.error('Error importing policy template:', error);
    res.status(500).json({ error: 'Failed to import policy template' });
  }
});

// Bulk update policy rules
router.patch('/rules/bulk', requireAuth, requireRole(['admin', 'policy_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { ruleIds, updates } = req.body;

    const results = await policyEngine.bulkUpdatePolicyRules(ruleIds, updates);

    await auditLogger.log({
      action: 'policy_rules_bulk_updated',
      userId: req.user.id,
      organizationId,
      details: { ruleIds, updates, updatedCount: results.length }
    });

    res.json(results);
  } catch (error) {
    console.error('Error bulk updating policy rules:', error);
    res.status(500).json({ error: 'Failed to bulk update policy rules' });
  }
});

// Get policy compliance summary
router.get('/compliance-summary', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const summary = await policyEngine.getComplianceSummary(
      organizationId,
      startDate as string,
      endDate as string
    );

    res.json(summary);
  } catch (error) {
    console.error('Error fetching compliance summary:', error);
    res.status(500).json({ error: 'Failed to fetch compliance summary' });
  }
});

export default router;
