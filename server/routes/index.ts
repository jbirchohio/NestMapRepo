import { Router } from 'express';
import authRoutes from './auth';
import tripRoutes from './trips';
import activityRoutes from './activities';
import organizationRoutes from './organizations';
import analyticsRoutes from './analytics';
import performanceRoutes from './performance';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/performance', performanceRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'nestmap-api'
  });
});

export default router;