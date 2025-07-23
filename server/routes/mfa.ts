import express from 'express';
import { MFAService } from '../mfaService';
import { authenticateJWT as requireAuth } from '../src/middleware/auth';
import { auditLogger } from '../auditLogger';

const router = express.Router();
const mfaService = MFAService.getInstance();

// Get user's MFA methods
router.get('/methods', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const methods = await mfaService.getUserMFAMethods(userId);

    res.json(methods);
  } catch (error) {
    console.error('Error fetching MFA methods:', error);
    res.status(500).json({ error: 'Failed to fetch MFA methods' });
  }
});

// Setup TOTP
router.post('/setup/totp', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { appName } = req.body;

    const setup = await mfaService.setupTOTP(userId, appName || 'NestMap');

    await auditLogger.log({
      action: 'mfa_totp_setup_initiated',
      userId,
      organizationId: req.user.organizationId,
      details: { appName }
    });

    res.json(setup);
  } catch (error) {
    console.error('Error setting up TOTP:', error);
    res.status(500).json({ error: 'Failed to setup TOTP' });
  }
});

// Verify TOTP setup
router.post('/setup/totp/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { secret, token } = req.body;

    const result = await mfaService.verifyTOTPSetup(userId, secret, token);

    if (result.success) {
      await auditLogger.log({
        action: 'mfa_totp_setup_completed',
        userId,
        organizationId: req.user.organizationId,
        details: { methodId: result.methodId }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error verifying TOTP setup:', error);
    res.status(500).json({ error: 'Failed to verify TOTP setup' });
  }
});

// Setup SMS
router.post('/setup/sms', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const setup = await mfaService.setupSMS(userId, phoneNumber);

    await auditLogger.log({
      action: 'mfa_sms_setup_initiated',
      userId,
      organizationId: req.user.organizationId,
      details: { phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') } // Mask phone number
    });

    res.json(setup);
  } catch (error) {
    console.error('Error setting up SMS:', error);
    res.status(500).json({ error: 'Failed to setup SMS' });
  }
});

// Verify SMS setup
router.post('/setup/sms/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber, code } = req.body;

    const result = await mfaService.verifySMSSetup(userId, phoneNumber, code);

    if (result.success) {
      await auditLogger.log({
        action: 'mfa_sms_setup_completed',
        userId,
        organizationId: req.user.organizationId,
        details: { methodId: result.methodId }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error verifying SMS setup:', error);
    res.status(500).json({ error: 'Failed to verify SMS setup' });
  }
});

// Create MFA challenge
router.post('/challenge', async (req, res) => {
  try {
    const { userId, methodId } = req.body;

    if (!userId || !methodId) {
      return res.status(400).json({ error: 'User ID and method ID are required' });
    }

    const challenge = await mfaService.createChallenge(userId, methodId);

    await auditLogger.log({
      action: 'mfa_challenge_created',
      userId,
      details: { methodId, challengeId: challenge.id }
    });

    res.json(challenge);
  } catch (error) {
    console.error('Error creating MFA challenge:', error);
    res.status(500).json({ error: 'Failed to create MFA challenge' });
  }
});

// Verify MFA challenge
router.post('/verify', async (req, res) => {
  try {
    const { challengeId, code } = req.body;

    if (!challengeId || !code) {
      return res.status(400).json({ error: 'Challenge ID and code are required' });
    }

    const result = await mfaService.verifyChallenge(challengeId, code);

    await auditLogger.log({
      action: 'mfa_challenge_verified',
      userId: result.userId,
      details: { 
        challengeId, 
        success: result.success,
        methodType: result.methodType
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error verifying MFA challenge:', error);
    res.status(500).json({ error: 'Failed to verify MFA challenge' });
  }
});

// Disable MFA method
router.delete('/methods/:methodId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { methodId } = req.params;

    const result = await mfaService.disableMFAMethod(userId, methodId);

    await auditLogger.log({
      action: 'mfa_method_disabled',
      userId,
      organizationId: req.user.organizationId,
      details: { methodId }
    });

    res.json(result);
  } catch (error) {
    console.error('Error disabling MFA method:', error);
    res.status(500).json({ error: 'Failed to disable MFA method' });
  }
});

// Generate backup codes
router.post('/backup-codes', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const backupCodes = await mfaService.generateBackupCodes(userId);

    await auditLogger.log({
      action: 'mfa_backup_codes_generated',
      userId,
      organizationId: req.user.organizationId,
      details: { codeCount: backupCodes.length }
    });

    res.json({ backupCodes });
  } catch (error) {
    console.error('Error generating backup codes:', error);
    res.status(500).json({ error: 'Failed to generate backup codes' });
  }
});

// Verify backup code
router.post('/backup-codes/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and backup code are required' });
    }

    const result = await mfaService.verifyBackupCode(userId, code);

    await auditLogger.log({
      action: 'mfa_backup_code_used',
      userId,
      details: { success: result.success }
    });

    res.json(result);
  } catch (error) {
    console.error('Error verifying backup code:', error);
    res.status(500).json({ error: 'Failed to verify backup code' });
  }
});

// Get MFA status for user
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await mfaService.getMFAStatus(userId);

    res.json(status);
  } catch (error) {
    console.error('Error fetching MFA status:', error);
    res.status(500).json({ error: 'Failed to fetch MFA status' });
  }
});

// Reset MFA (admin only)
router.post('/reset/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required to reset MFA' });
    }

    const result = await mfaService.resetMFA(parseInt(userId));

    await auditLogger.log({
      action: 'mfa_reset_by_admin',
      userId: adminId,
      organizationId: req.user.organizationId,
      details: { targetUserId: userId }
    });

    res.json(result);
  } catch (error) {
    console.error('Error resetting MFA:', error);
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});

export default router;
