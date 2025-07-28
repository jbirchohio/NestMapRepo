import { t } from '../context';
import { healthRouter } from './health';

export const appRouter = t.router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
