import { t } from '../context';
import { z } from 'zod';

const healthQuerySchema = z.object({
  detailed: z.boolean().optional(),
});

export const healthRouter = t.router({
  status: t.procedure
    .input(healthQuerySchema)
    .query(({ input }) => {
      const detailed = input.detailed ?? false;
      const response = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
      };
      if (detailed) {
        return {
          ...response,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
        };
      }
      return response;
    }),
});
