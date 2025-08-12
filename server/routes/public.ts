import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';

const router = Router();

// Public trip sharing endpoint - NO AUTH REQUIRED
router.get('/share/:shareCode', async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    
    if (!shareCode) {
      return res.status(400).json({ message: 'Share code is required' });
    }

    // Get trip by share code
    const trip = await storage.getTripByShareCode(shareCode);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or sharing not enabled' });
    }

    // Check if sharing is enabled
    if (!trip.sharing_enabled) {
      return res.status(403).json({ message: 'This trip is not shared' });
    }

    // Get activities for the trip
    const activities = await storage.getActivitiesByTripId(trip.id);
    
    // Get notes for the trip (if allowed)
    const notes = trip.share_permission === 'edit' ? await storage.getNotesByTripId(trip.id) : [];
    
    // Get todos for the trip (if allowed)
    const todos = trip.share_permission === 'edit' ? await storage.getTodosByTripId(trip.id) : [];

    // Track view analytics
    logger.info('Public trip view', { 
      shareCode, 
      tripId: trip.id, 
      permission: trip.share_permission 
    });

    // Return public trip data (no sensitive user info)
    res.json({
      id: trip.id,
      title: trip.title,
      destination: trip.city || trip.location,
      location: trip.location,
      startDate: trip.start_date,
      endDate: trip.end_date,
      description: trip.description,
      sharePermission: trip.share_permission,
      activities: activities.map(activity => ({
        id: activity.id,
        title: activity.title,
        locationName: activity.location_name,
        date: activity.date,
        time: activity.time,
        // duration: activity.duration, // TODO: Add duration field to activities table
        notes: activity.notes,
        latitude: activity.latitude,
        longitude: activity.longitude,
        category: activity.category
      })),
      notes: notes.map(note => ({
        id: note.id,
        content: note.content,
        createdAt: note.created_at
      })),
      todos: todos.map(todo => ({
        id: todo.id,
        task: todo.content,
        completed: todo.is_completed || false,
        priority: 'medium' // TODO: Add priority field to todos table
      })),
      // Basic trip metadata
      duration: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      activitiesCount: activities.length,
      createdAt: trip.created_at
    });
  } catch (error) {
    logger.error('Error fetching public trip:', error);
    res.status(500).json({ message: 'Could not fetch trip' });
  }
});

// Track guest-to-user conversion
router.post('/share/:shareCode/interested', async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    const { email, action } = req.body;

    // Log interest for conversion tracking
    logger.info('Guest showed interest', {
      shareCode,
      email,
      action, // 'signup', 'edit', 'suggest'
      timestamp: new Date()
    });

    res.json({ 
      success: true,
      message: 'Interest recorded. Sign up to start planning your own trips!'
    });
  } catch (error) {
    logger.error('Error tracking interest:', error);
    res.status(500).json({ message: 'Could not track interest' });
  }
});

export default router;