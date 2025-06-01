import { Router } from 'express';
import authRoutes from './auth';
import tripRoutes from './trips';
import activityRoutes from './activities';
import organizationRoutes from './organizations';
import analyticsRoutes from './analytics';
import performanceRoutes from './performance';
import adminRoutes from './admin';
import calendarRoutes from './calendar';
import collaborationRoutes from './collaboration';
import bookingRoutes from './bookings';
import approvalRoutes from './approvals';
import expenseRoutes from './expenses';
import reportingRoutes from './reporting';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/performance', performanceRoutes);
router.use('/admin', adminRoutes);
router.use('/calendar', calendarRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/approvals', approvalRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reporting', reportingRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'nestmap-api'
  });
});

export default router;