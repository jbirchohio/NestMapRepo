import express from 'express';
import { PolicyEngine } from '../policyEngine';
import { ComplianceService } from '../complianceService';
import { EnhancedApprovalWorkflow } from '../enhancedApprovalWorkflow';
import { authenticateJWT as requireAuth, requireRole } from '../middleware/auth';
import { auditLogger } from '../auditLogger';

const router = express.Router();
const policyEngine = PolicyEngine.getInstance();
const complianceService = ComplianceService.getInstance();
const approvalWorkflow = EnhancedApprovalWorkflow.getInstance();

// Get compliance metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get policy metrics
    const totalPolicies = await policyEngine.getPolicyCount(organizationId);
    const activePolicies = await policyEngine.getActivePolicyCount(organizationId);
    
    // Get violation metrics
    const violationsLast30Days = await policyEngine.getViolationCount(organizationId, 30);
    const complianceRate = totalPolicies > 0 ? 
      Math.round(((totalPolicies - violationsLast30Days) / totalPolicies) * 100) : 100;
    
    // Get top violations
    const topViolations = await policyEngine.getTopViolations(organizationId, 5);
    
    const metrics = {
      totalPolicies,
      activePolicies,
      violationsLast30Days,
      complianceRate,
      topViolations
    };

    await auditLogger.log({
      action: 'compliance_metrics_viewed',
      userId: req.user.id,
      organizationId,
      details: { metricsRequested: true }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching compliance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch compliance metrics' });
  }
});

// Get policy violations
router.get('/violations', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, severity, entityType, limit = 50 } = req.query;
    
    const violations = await policyEngine.getViolations(organizationId, {
      status: status as string,
      severity: severity as string,
      entityType: entityType as string,
      limit: parseInt(limit as string)
    });

    await auditLogger.log({
      action: 'policy_violations_viewed',
      userId: req.user.id,
      organizationId,
      details: { 
        filters: { status, severity, entityType },
        violationCount: violations.length 
      }
    });

    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// Resolve a violation
router.post('/violations/:violationId/resolve', requireAuth, async (req, res) => {
  try {
    const { violationId } = req.params;
    const { resolution, comments } = req.body;
    const organizationId = req.user.organizationId;

    await policyEngine.resolveViolation(violationId, req.user.id, {
      resolution,
      comments
    });

    await auditLogger.log({
      action: 'policy_violation_resolved',
      userId: req.user.id,
      organizationId,
      details: { violationId, resolution, comments }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving violation:', error);
    res.status(500).json({ error: 'Failed to resolve violation' });
  }
});

// Check compliance for a trip
router.post('/check-trip', requireAuth, async (req, res) => {
  try {
    const { tripData } = req.body;
    const organizationId = req.user.organizationId;

    const complianceCheck = await policyEngine.checkTripCompliance(
      tripData,
      req.user.id,
      organizationId
    );

    // If violations require approval, create approval request
    if (complianceCheck.requiresApproval && complianceCheck.approvalRequired.length > 0) {
      const approvalRequest = await approvalWorkflow.createApprovalRequest(
        organizationId,
        req.user.id,
        'trip',
        tripData.id,
        {
          ...tripData,
          policyViolations: complianceCheck.violations.map(v => v.message)
        }
      );

      complianceCheck.approvalRequestId = approvalRequest.id;
    }

    await auditLogger.log({
      action: 'trip_compliance_checked',
      userId: req.user.id,
      organizationId,
      details: { 
        tripId: tripData.id,
        passed: complianceCheck.passed,
        violationCount: complianceCheck.violations.length,
        requiresApproval: complianceCheck.requiresApproval
      }
    });

    res.json(complianceCheck);
  } catch (error) {
    console.error('Error checking trip compliance:', error);
    res.status(500).json({ error: 'Failed to check trip compliance' });
  }
});

// GDPR/CCPA Compliance endpoints
router.get('/frameworks', requireAuth, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const frameworks = await complianceService.getComplianceFrameworks(organizationId);
    
    res.json(frameworks);
  } catch (error) {
    console.error('Error fetching compliance frameworks:', error);
    res.status(500).json({ error: 'Failed to fetch compliance frameworks' });
  }
});

// Submit data subject rights request
router.post('/rights-request', requireAuth, async (req, res) => {
  try {
    const { requestType, requestDetails } = req.body;
    const organizationId = req.user.organizationId;

    const rightsRequest = await complianceService.submitRightsRequest(
      req.user.id,
      requestType,
      requestDetails
    );

    await auditLogger.log({
      action: 'data_rights_request_submitted',
      userId: req.user.id,
      organizationId,
      details: { requestType, requestId: rightsRequest.id }
    });

    res.json(rightsRequest);
  } catch (error) {
    console.error('Error submitting rights request:', error);
    res.status(500).json({ error: 'Failed to submit rights request' });
  }
});

// Get compliance report
router.get('/report', requireAuth, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { framework, startDate, endDate } = req.query;

    const report = await complianceService.generateComplianceReport(
      organizationId,
      framework as string,
      startDate as string,
      endDate as string
    );

    await auditLogger.log({
      action: 'compliance_report_generated',
      userId: req.user.id,
      organizationId,
      details: { framework, startDate, endDate }
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Run compliance checks
router.post('/run-checks', requireAuth, requireRole(['admin', 'compliance_officer']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { framework } = req.body;

    const results = await complianceService.runComplianceChecks(organizationId, framework);

    await auditLogger.log({
      action: 'compliance_checks_run',
      userId: req.user.id,
      organizationId,
      details: { framework, checksRun: results.length }
    });

    res.json(results);
  } catch (error) {
    console.error('Error running compliance checks:', error);
    res.status(500).json({ error: 'Failed to run compliance checks' });
  }
});

export default router;

