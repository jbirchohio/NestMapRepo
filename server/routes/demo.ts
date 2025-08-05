import { Router } from 'express';
import { demoResetService } from '../services/demoResetService';
import { isDemoModeEnabled } from '../demoMode';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';

const router = Router();

// Public endpoint to check demo mode status
router.get('/status', (req, res) => {
  res.json({
    enabled: isDemoModeEnabled(),
    message: isDemoModeEnabled() 
      ? 'Demo mode is active. Use header "X-Demo-Mode: true" or login with demo credentials.'
      : 'Demo mode is not enabled. Set ENABLE_DEMO_MODE=true in environment.',
    credentials: isDemoModeEnabled() ? {
      users: [
        { email: 'sarah.chen@techcorp.demo', password: 'demo123', role: 'Admin' },
        { email: 'mike.rodriguez@techcorp.demo', password: 'demo123', role: 'Manager' },
        { email: 'emma.thompson@techcorp.demo', password: 'demo123', role: 'User' },
        { email: 'alex@creativestudio.demo', password: 'demo123', role: 'Admin' },
        { email: 'jessica@creativestudio.demo', password: 'demo123', role: 'User' }
      ],
      headers: {
        'X-Demo-Mode': 'true',
        'X-Demo-User-Id': 'demo-{username}'
      }
    } : null,
    limits: {
      trips: 10,
      activities: 50,
      sessionDuration: '30 minutes',
      resetInterval: '30 minutes'
    }
  });
});

// Get demo statistics
router.get('/stats', async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(404).json({ error: 'Demo mode not enabled' });
  }

  try {
    const stats = await demoResetService.getDemoStats();
    const nextReset = new Date();
    nextReset.setMinutes(nextReset.getMinutes() < 30 ? 30 : 60, 0, 0);

    res.json({
      ...stats,
      nextResetAt: nextReset,
      nextResetIn: Math.floor((nextReset.getTime() - Date.now()) / 1000) // seconds
    });
  } catch (error) {
    console.error('Error getting demo stats:', error);
    res.status(500).json({ error: 'Failed to get demo statistics' });
  }
});

// Manual reset endpoint (requires auth and demo mode)
router.post('/reset', jwtAuthMiddleware, async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(404).json({ error: 'Demo mode not enabled' });
  }

  // Only allow super admins or demo users to reset
  if (req.user?.role !== 'super_admin' && !req.headers['x-demo-admin']) {
    return res.status(403).json({ error: 'Not authorized to reset demo data' });
  }

  try {
    const result = await demoResetService.resetDemoData();
    res.json(result);
  } catch (error) {
    console.error('Error resetting demo:', error);
    res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

// Reseed demo data from scratch
router.post('/reseed', jwtAuthMiddleware, async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(404).json({ error: 'Demo mode not enabled' });
  }

  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can reseed demo data' });
  }

  try {
    const result = await demoResetService.reseedDemoData();
    res.json(result);
  } catch (error) {
    console.error('Error reseeding demo:', error);
    res.status(500).json({ error: 'Failed to reseed demo data' });
  }
});

// Demo quick login endpoint
router.post('/quick-login', async (req, res) => {
  if (!isDemoModeEnabled()) {
    return res.status(404).json({ error: 'Demo mode not enabled' });
  }

  const { role = 'user' } = req.body;
  
  // Map role to demo user
  const demoUsers: Record<string, { email: string; password: string }> = {
    admin: { email: 'sarah.chen@techcorp.demo', password: 'demo123' },
    manager: { email: 'mike.rodriguez@techcorp.demo', password: 'demo123' },
    user: { email: 'emma.thompson@techcorp.demo', password: 'demo123' }
  };

  const demoUser = demoUsers[role.toLowerCase()] || demoUsers.user;

  // Import auth controller to handle login
  const { login } = await import('../controllers/auth');
  
  // Create a fake request/response to reuse login logic
  const fakeReq: any = {
    body: demoUser,
    headers: { 'x-demo-mode': 'true' }
  };

  const fakeRes: any = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 200) {
          res.json({
            ...data,
            demoMode: true,
            message: 'Logged in with demo account'
          });
        } else {
          res.status(code).json(data);
        }
      }
    }),
    json: (data: any) => res.json(data)
  };

  await login(fakeReq, fakeRes);
});

export default router;