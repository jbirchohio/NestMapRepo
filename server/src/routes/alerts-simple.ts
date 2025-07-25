import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all alert routes
router.use(authenticateJWT);

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'security' | 'system' | 'network';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

// In-memory alert storage for demo purposes
let systemAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'warning',
    category: 'performance',
    title: 'High Memory Usage',
    message: 'Server memory usage is above 80%',
    timestamp: new Date().toISOString(),
    acknowledged: false
  },
  {
    id: '2',
    type: 'info',
    category: 'system',
    title: 'Scheduled Maintenance',
    message: 'System maintenance scheduled for tonight',
    timestamp: new Date().toISOString(),
    acknowledged: false
  }
];

let alertIdCounter = 3;

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const { acknowledged } = req.query;
    let filteredAlerts = systemAlerts;
    
    if (acknowledged === 'false') {
      filteredAlerts = systemAlerts.filter(alert => !alert.acknowledged);
    } else if (acknowledged === 'true') {
      filteredAlerts = systemAlerts.filter(alert => alert.acknowledged);
    }
    
    res.json({
      success: true,
      data: filteredAlerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Acknowledge an alert
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const alertIndex = systemAlerts.findIndex(alert => alert.id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    systemAlerts[alertIndex].acknowledged = true;
    
    res.json({
      success: true,
      data: systemAlerts[alertIndex]
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Acknowledge all alerts
router.post('/acknowledge-all', async (_req, res) => {
  try {
    systemAlerts = systemAlerts.map(alert => ({
      ...alert,
      acknowledged: true
    }));
    
    res.json({
      success: true,
      message: 'All alerts acknowledged'
    });
  } catch (error) {
    console.error('Error acknowledging all alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge all alerts'
    });
  }
});

// Clear old alerts
router.delete('/clear-old', async (_req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialCount = systemAlerts.length;
    
    systemAlerts = systemAlerts.filter(
      alert => new Date(alert.timestamp) > oneDayAgo || !alert.acknowledged
    );
    
    const clearedCount = initialCount - systemAlerts.length;
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} old alerts`
    });
  } catch (error) {
    console.error('Error clearing old alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear old alerts'
    });
  }
});

// Get alert statistics
router.get('/stats', async (_req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recent24h = systemAlerts.filter(
      alert => new Date(alert.timestamp) > last24Hours
    );
    const recentHour = systemAlerts.filter(
      alert => new Date(alert.timestamp) > lastHour
    );
    
    res.json({
      success: true,
      data: {
        total: systemAlerts.length,
        last24Hours: {
          total: recent24h.length,
          critical: recent24h.filter(a => a.type === 'critical').length,
          warning: recent24h.filter(a => a.type === 'warning').length,
          info: recent24h.filter(a => a.type === 'info').length,
        },
        lastHour: {
          total: recentHour.length,
          critical: recentHour.filter(a => a.type === 'critical').length,
          warning: recentHour.filter(a => a.type === 'warning').length,
          info: recentHour.filter(a => a.type === 'info').length,
        },
        byCategory: {
          performance: systemAlerts.filter(a => a.category === 'performance').length,
          security: systemAlerts.filter(a => a.category === 'security').length,
          system: systemAlerts.filter(a => a.category === 'system').length,
          network: systemAlerts.filter(a => a.category === 'network').length,
        },
        acknowledged: systemAlerts.filter(a => a.acknowledged).length,
        unacknowledged: systemAlerts.filter(a => !a.acknowledged).length
      }
    });
  } catch (error) {
    console.error('Error getting alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert statistics'
    });
  }
});

export default router;
