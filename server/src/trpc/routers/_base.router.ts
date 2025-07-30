import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from '../context';

// Initialize tRPC with superjson for better date/Map/Set serialization
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // Optional: Add any custom error formatting here
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const middleware = t.middleware;

type UserRole = 'member' | 'admin' | 'owner';

/**
 * Middleware to check if user is authenticated
 */
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action'
    });
  }
  return next({
    ctx: {
      ...ctx,
      // Ensures user ID is available in all procedures after this middleware
      userId: ctx.userId,
      user: ctx.user,
    },
  });
});

/**
 * Middleware to check if user has admin role
 */
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.roles.includes('admin')) {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Admin access required' 
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId as string, // Ensured by isAuthed middleware
    },
  });
});

/**
 * Middleware to check organization access
 */
const withOrgAccess = (requiredRole: UserRole = 'member') => 
  middleware(async ({ ctx, next }) => {
    if (!ctx.orgId) {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'Organization ID is required' 
      });
    }

    // In a real app, you would check the user's role in the organization here
    // For now, we'll just pass through the organization ID
    
    return next({
      ctx: {
        ...ctx,
        orgId: ctx.orgId,
      },
    });
  });

// Reusable procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = publicProcedure.use(isAuthed);
export const adminProcedure = protectedProcedure.use(isAdmin);

export const orgProcedure = (requiredRole: UserRole = 'member') => 
  protectedProcedure.use(withOrgAccess(requiredRole));

export const adminOrgProcedure = (requiredRole: UserRole = 'admin') =>
  adminProcedure.use(withOrgAccess(requiredRole));
