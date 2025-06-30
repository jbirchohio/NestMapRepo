import { Router } from 'express';
import { db } from '../db.js';
import { notifications } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
const router = Router();
// Apply authentication to all notification routes
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);
// GET /api/notifications - Get user notifications
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.user_id, req.user.id))
            .orderBy(desc(notifications.created_at))
            .limit(50);
        const unreadCount = userNotifications.filter(n => !n.read).length;
        res.json({
            success: true,
            data: {
                notifications: userNotifications,
                unread_count: unreadCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch notifications' }
        });
    }
});
// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const notificationId = parseInt(req.params.id);
        await db
            .update(notifications)
            .set({ read: true, updated_at: new Date() })
            .where(and(eq(notifications.id, notificationId), eq(notifications.user_id, req.user.id)));
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to mark notification as read' }
        });
    }
});
// POST /api/notifications/mark-all-read - Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        await db
            .update(notifications)
            .set({ read: true, updated_at: new Date() })
            .where(eq(notifications.user_id, req.user.id));
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to mark all notifications as read' }
        });
    }
});
// POST /api/notifications/test - Create test notification (development only)
router.post('/test', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: 'Test endpoint not available in production' });
        }
        const testNotification = await db.insert(notifications).values({
            user_id: req.user.id,
            organization_id: req.user.organization_id,
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working.',
            priority: 'normal',
            read: false,
            created_at: new Date(),
            updated_at: new Date()
        }).returning();
        res.json({
            success: true,
            message: 'Test notification created',
            data: testNotification[0]
        });
    }
    catch (error) {
        console.error('Error creating test notification:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to create test notification' }
        });
    }
});
export default router;
