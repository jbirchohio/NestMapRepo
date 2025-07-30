import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from './_base.router';
import { AuthService } from '../../auth/auth.service';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto 
} from '../../auth/dtos/auth.dto';

// Initialize services
const authService = new AuthService();

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().optional(),
  organizationId: z.string().optional(),
  role: z.enum(['admin', 'member', 'viewer']).optional().default('member')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const authRouter = router({
  // User login
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const ip = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown';
        const userAgent = ctx.req?.headers?.['user-agent'] || '';
        
        const loginData: LoginDto = input;
        const response = await authService.login(loginData, ip, userAgent);
        
        return {
          success: true,
          data: response
        };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Invalid credentials',
          cause: error
        });
      }
    }),

  // User registration
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const ip = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown';
        const userAgent = ctx.req?.headers?.['user-agent'] || '';
        
        const registerData: RegisterDto = input;
        const response = await authService.register(registerData, ip, userAgent);
        
        return {
          success: true,
          data: response
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Registration failed',
          cause: error
        });
      }
    }),

  // Refresh access token
  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const ip = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown';
        const userAgent = ctx.req?.headers?.['user-agent'] || '';
        
        const refreshData: RefreshTokenDto = { refreshToken: input.refreshToken };
        const response = await authService.refreshToken(refreshData, ip, userAgent);
        
        return {
          success: true,
          data: response
        };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
          cause: error
        });
      }
    }),

  // Logout
  logout: protectedProcedure
    .input(z.object({
      refreshToken: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const authHeader = ctx.req?.headers?.authorization;
        await authService.logout(input.refreshToken, authHeader);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout',
          cause: error
        });
      }
    }),

  // Logout from all devices
  logoutAllDevices: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }
        
        await authService.revokeAllSessions(ctx.user.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout from all devices',
          cause: error
        });
      }
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input }) => {
      try {
        const requestData: RequestPasswordResetDto = input;
        await authService.requestPasswordReset(requestData);
        // Don't leak whether email exists
        return { success: true };
      } catch (error) {
        // Still return success to prevent email enumeration
        return { success: true };
      }
    }),

  // Reset password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      try {
        const resetData: ResetPasswordDto = {
          token: input.token,
          newPassword: input.newPassword
        };
        await authService.resetPassword(resetData);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired token',
          cause: error
        });
      }
    }),

  // Get current user
  getMe: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Not authenticated'
          });
        }
        
        // In a real implementation, fetch fresh user data from the database
        return {
          success: true,
          data: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            organizationId: ctx.user.orgId
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user data',
          cause: error
        });
      }
    })
});

export type AuthRouter = typeof authRouter;
