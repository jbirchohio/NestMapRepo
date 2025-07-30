import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { type Context } from '../context';

// Initialize tRPC with superjson for better date/Map/Set serialization
export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // Optional: Add any custom error formatting here
  errorFormatter({ shape }) {
    return shape;
  },
});

// Reusable router and procedure helpers
export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
