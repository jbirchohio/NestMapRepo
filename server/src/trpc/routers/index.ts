import { router } from './_base.router';
import { healthRouter } from './health';
import { authRouter } from './auth.router';
import { userRouter } from './user.router';
import { userManagementRouter } from './user-management.router';
import { mfaRouter } from './mfa.router';
import { whiteLabelRouter } from './whiteLabel.router';
import { activityRouter } from './activity.router';
import { adminAnalyticsRouter } from './adminAnalytics.router';
import { paymentsRouter } from './payments.router';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  userManagement: userManagementRouter,
  mfa: mfaRouter,
  whiteLabel: whiteLabelRouter,
  activity: activityRouter,
  adminAnalytics: adminAnalyticsRouter,
  payments: paymentsRouter,
  // Add other routers here
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
