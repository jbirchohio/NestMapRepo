import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_base.router';
import { MFAService } from '../../mfaService';
import { auditLogger } from '../../auditLogger';

const mfaService = MFAService.getInstance();

export const mfaRouter = router({
  // Get user's MFA methods
  getMethods: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const methods = await mfaService.getUserMFAMethods(ctx.user.id);
        return { success: true, data: methods };
      } catch (error) {
        console.error('Error fetching MFA methods:', error);
        throw new Error('Failed to fetch MFA methods');
      }
    }),

  // Setup TOTP
  setupTOTP: protectedProcedure
    .input(z.object({
      appName: z.string().optional().default('NestMap'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const setup = await mfaService.setupTOTP(ctx.user.id, input.appName);
        
        await auditLogger.log({
          action: 'mfa_setup_totp',
          userId: ctx.user.id,
          metadata: { method: 'totp' },
          status: 'success',
        });

        return { success: true, data: setup };
      } catch (error) {
        console.error('Error setting up TOTP:', error);
        throw new Error('Failed to setup TOTP');
      }
    }),

  // Verify TOTP setup
  verifyTOTP: protectedProcedure
    .input(z.object({
      token: z.string(),
      secret: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await mfaService.verifyTOTP({
          userId: ctx.user.id,
          token: input.token,
          secret: input.secret,
        });

        if (result.valid) {
          await auditLogger.log({
            action: 'mfa_verify_totp',
            userId: ctx.user.id,
            metadata: { method: 'totp' },
            status: 'success',
          });
        }

        return { success: result.valid };
      } catch (error) {
        console.error('Error verifying TOTP:', error);
        throw new Error('Failed to verify TOTP');
      }
    }),

  // Setup SMS
  setupSMS: protectedProcedure
    .input(z.object({
      phoneNumber: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await mfaService.setupSMS(ctx.user.id, input.phoneNumber);
        
        await auditLogger.log({
          action: 'mfa_setup_sms',
          userId: ctx.user.id,
          metadata: { method: 'sms' },
          status: 'success',
        });

        return { success: true };
      } catch (error) {
        console.error('Error setting up SMS:', error);
        throw new Error('Failed to setup SMS');
      }
    }),

  // Verify SMS setup
  verifySMS: protectedProcedure
    .input(z.object({
      code: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await mfaService.verifySMS({
          userId: ctx.user.id,
          code: input.code,
        });

        if (result.valid) {
          await auditLogger.log({
            action: 'mfa_verify_sms',
            userId: ctx.user.id,
            metadata: { method: 'sms' },
            status: 'success',
          });
        }

        return { success: result.valid };
      } catch (error) {
        console.error('Error verifying SMS:', error);
        throw new Error('Failed to verify SMS');
      }
    }),

  // Remove MFA method
  removeMethod: protectedProcedure
    .input(z.object({
      methodId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await mfaService.removeMFAMethod(ctx.user.id, input.methodId);
        
        await auditLogger.log({
          action: 'mfa_remove_method',
          userId: ctx.user.id,
          metadata: { methodId: input.methodId },
          status: 'success',
        });

        return { success: true };
      } catch (error) {
        console.error('Error removing MFA method:', error);
        throw new Error('Failed to remove MFA method');
      }
    }),

  // Get MFA status
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const status = await mfaService.getMFAStatus(ctx.user.id);
        return { success: true, data: status };
      } catch (error) {
        console.error('Error getting MFA status:', error);
        throw new Error('Failed to get MFA status');
      }
    }),

  // Reset MFA for user (admin only)
  resetForUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has admin privileges
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }

        await mfaService.resetForUser(input.userId);
        
        await auditLogger.log({
          action: 'mfa_reset_for_user',
          userId: ctx.user.id,
          targetUserId: input.userId,
          status: 'success',
        });

        return { success: true };
      } catch (error) {
        console.error('Error resetting MFA for user:', error);
        throw new Error('Failed to reset MFA for user');
      }
    }),
});
