import { Router } from 'express';
import { teamCollaborationService } from '../services/teamCollaborationService';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';

const router = Router();

// Apply auth and organization context to all routes
router.use(jwtAuthMiddleware);
router.use(requireOrganizationContext);

// Add comment to trip or activity
router.post('/comments', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const comment = await teamCollaborationService.addComment({
      ...req.body,
      user_id: req.user.id,
      organization_id: req.organizationContext.id
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for a trip/activity
router.get('/comments/:tripId', async (req, res) => {
  try {
    const comments = await teamCollaborationService.getComments(
      parseInt(req.params.tripId),
      req.query.activityId ? parseInt(req.query.activityId as string) : undefined
    );

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get team calendar
router.get('/calendar', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { startDate, endDate, userIds } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }

    const calendar = await teamCollaborationService.getTeamCalendar(
      req.organizationContext.id,
      new Date(startDate as string),
      new Date(endDate as string),
      userIds ? (userIds as string).split(',').map(id => parseInt(id)) : undefined
    );

    res.json(calendar);
  } catch (error) {
    console.error('Error fetching team calendar:', error);
    res.status(500).json({ error: 'Failed to fetch team calendar' });
  }
});

// Get team presence/availability
router.get('/presence', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const presence = await teamCollaborationService.getTeamPresence(
      req.organizationContext.id,
      req.query.date ? new Date(req.query.date as string) : new Date()
    );

    res.json(presence);
  } catch (error) {
    console.error('Error fetching team presence:', error);
    res.status(500).json({ error: 'Failed to fetch team presence' });
  }
});

// Create shared expense report
router.post('/shared-expenses', async (req, res) => {
  try {
    const { tripId, userIds, expenses } = req.body;

    if (!tripId || !userIds || !expenses) {
      return res.status(400).json({ 
        error: 'Trip ID, user IDs, and expenses required' 
      });
    }

    const report = await teamCollaborationService.createSharedExpenseReport(
      tripId,
      userIds,
      expenses
    );

    res.json(report);
  } catch (error) {
    console.error('Error creating shared expense report:', error);
    res.status(500).json({ error: 'Failed to create shared expense report' });
  }
});

// Find meeting slots
router.post('/meeting-slots', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { attendeeIds, duration, startRange, endRange } = req.body;

    if (!attendeeIds || !duration || !startRange || !endRange) {
      return res.status(400).json({ 
        error: 'All parameters required' 
      });
    }

    const slots = await teamCollaborationService.findMeetingSlots(
      req.organizationContext.id,
      attendeeIds,
      duration,
      new Date(startRange),
      new Date(endRange)
    );

    res.json(slots);
  } catch (error) {
    console.error('Error finding meeting slots:', error);
    res.status(500).json({ error: 'Failed to find meeting slots' });
  }
});

// Delegate trip
router.post('/trips/:tripId/delegate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { toUserId, notes } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }

    await teamCollaborationService.delegateTrip(
      parseInt(req.params.tripId),
      req.user.id,
      toUserId,
      notes
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error delegating trip:', error);
    res.status(500).json({ error: 'Failed to delegate trip' });
  }
});

export default router;