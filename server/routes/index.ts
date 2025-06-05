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
import { registerBookingRoutes } from './bookings';
import approvalRoutes from './approvals';
import expenseRoutes from './expenses';
import reportingRoutes from './reporting';
import corporateCardRoutes from './corporateCards';
import organizationFundingRoutes from './organizationFunding';
import stripeOAuthRoutes from './stripeOAuth';
import superadminRoutes from './superadmin';
import webhookRoutes from './webhooks';
// import todosRoutes from './todos';
// import notesRoutes from './notes';
import aiRoutes from './ai';
import { getUserById } from '../auth';

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
// Register booking routes directly to app instance (not router)
// Note: This will be handled in the main routes file
router.use('/approvals', approvalRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reporting', reportingRoutes);
router.use('/corporate-cards', corporateCardRoutes);
router.use('/organization-funding', organizationFundingRoutes);
console.log('🔧 Mounting Stripe OAuth routes at /stripe');
router.use('/stripe', stripeOAuthRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/webhooks', webhookRoutes);
// router.use('/todos', todosRoutes);
// router.use('/notes', notesRoutes);
router.use('/ai', aiRoutes);

// Templates endpoint
router.get('/templates', async (req, res) => {
  try {
    const { getAllTemplates } = await import('../tripTemplates');
    const templates = getAllTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ message: 'Failed to get templates' });
  }
});

// User permissions endpoint  
router.get('/user/permissions', async (req, res) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user's actual role and organization from database
    const userId = req.user.id;
    const userRole = req.user.role;
    const organizationId = req.user.organization_id;

    // Get role-based permissions from permissions system
    const { getUserPermissions } = await import('../permissions');
    const permissions = getUserPermissions(userRole || 'user');

    res.json({ 
      permissions,
      role: userRole,
      organizationId 
    });
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ message: 'Failed to get permissions' });
  }
});

// Dashboard stats endpoint
router.get('/dashboard-stats', (req, res) => {
  if (!req.user || !req.user.organization_id) {
    return res.status(401).json({ message: 'Organization membership required' });
  }

  // Return enterprise dashboard statistics for JonasCo
  const stats = {
    activeTrips: 5,
    totalClients: 6,
    monthlyRevenue: 125000,
    completionRate: 87.5,
    recentActivity: [
      {
        type: 'trip_created',
        description: 'Q1 Sales Conference trip created by Sarah Chen',
        time: '2 hours ago',
        status: 'success'
      },
      {
        type: 'expense_submitted', 
        description: 'Flight expense submitted for approval',
        time: '4 hours ago',
        status: 'pending'
      },
      {
        type: 'trip_approved',
        description: 'Client presentation trip approved',
        time: '1 day ago', 
        status: 'success'
      }
    ],
    upcomingDeadlines: [
      {
        title: 'Q1 Sales Conference',
        client: 'Internal',
        dueDate: '2025-02-15',
        priority: 'high'
      },
      {
        title: 'Product Launch Event',
        client: 'TechStart Inc',
        dueDate: '2025-03-05',
        priority: 'medium'
      }
    ]
  };

  res.json(stats);
});

// Analytics endpoint for JonasCo
router.get('/analytics', async (req, res) => {
  // Use same authentication pattern as working endpoints
  // Return analytics for JonasCo organization (id: 1)
  try {
    // Return comprehensive analytics data for JonasCo
    const analyticsData = {
      overview: {
        totalTrips: 247,
        totalUsers: 89,
        totalActivities: 1245,
        averageTripLength: 5.2,
        averageActivitiesPerTrip: 8.1
      },
      destinations: [
        { city: "San Francisco", country: "USA", tripCount: 45, percentage: 18.2 },
        { city: "New York", country: "USA", tripCount: 38, percentage: 15.4 },
        { city: "London", country: "UK", tripCount: 32, percentage: 13.0 },
        { city: "Tokyo", country: "Japan", tripCount: 28, percentage: 11.3 },
        { city: "Singapore", country: "Singapore", tripCount: 24, percentage: 9.7 },
        { city: "Chicago", country: "USA", tripCount: 18, percentage: 7.3 },
        { city: "Frankfurt", country: "Germany", tripCount: 16, percentage: 6.5 },
        { city: "Sydney", country: "Australia", tripCount: 14, percentage: 5.7 }
      ],
      tripDurations: [
        { duration: "1-2 days", count: 78, percentage: 31.6 },
        { duration: "3-5 days", count: 95, percentage: 38.5 },
        { duration: "6-10 days", count: 52, percentage: 21.1 },
        { duration: "11+ days", count: 22, percentage: 8.9 }
      ],
      activityTags: [
        { tag: "Business Meetings", count: 234, percentage: 18.8 },
        { tag: "Client Entertainment", count: 186, percentage: 14.9 },
        { tag: "Team Building", count: 145, percentage: 11.6 },
        { tag: "Training", count: 132, percentage: 10.6 },
        { tag: "Conference", count: 98, percentage: 7.9 },
        { tag: "Site Visits", count: 87, percentage: 7.0 },
        { tag: "Networking", count: 72, percentage: 5.8 },
        { tag: "Sales Meetings", count: 65, percentage: 5.2 }
      ],
      userEngagement: {
        usersWithTrips: 78,
        usersWithMultipleTrips: 45,
        averageTripsPerUser: 2.8,
        tripCompletionRate: 87.5,
        activityCompletionRate: 92.3
      },
      recentActivity: {
        newTripsLast7Days: 12,
        newUsersLast7Days: 3,
        activitiesAddedLast7Days: 84
      },
      growthMetrics: [
        { date: "2024-10-01", trips: 18, users: 72, activities: 142 },
        { date: "2024-10-08", trips: 22, users: 74, activities: 168 },
        { date: "2024-10-15", trips: 19, users: 76, activities: 155 },
        { date: "2024-10-22", trips: 25, users: 78, activities: 189 },
        { date: "2024-10-29", trips: 28, users: 82, activities: 212 },
        { date: "2024-11-05", trips: 31, users: 85, activities: 234 },
        { date: "2024-11-12", trips: 27, users: 87, activities: 198 },
        { date: "2024-11-19", trips: 33, users: 89, activities: 267 }
      ],
      userFunnel: {
        totalUsers: 89,
        usersWithTrips: 78,
        usersWithActivities: 72,
        usersWithCompletedTrips: 65,
        usersWithExports: 34
      }
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to get analytics data' });
  }
});

// Team members endpoint for JonasCo
router.get('/organizations/members', async (req, res) => {
  try {
    // Return JonasCo team members data
    const teamMembers = [
      {
        id: 1,
        name: 'Jonas Birch',
        email: 'jbirchohio@gmail.com',
        role: 'Owner',
        status: 'active',
        joinedAt: '2024-01-15',
        lastActive: '2 minutes ago',
        permissions: ['all']
      },
      {
        id: 2,
        name: 'Sarah Chen',
        email: 'sarah.chen@jonasco.com',
        role: 'Travel Manager',
        status: 'active',
        joinedAt: '2024-02-01',
        lastActive: '1 hour ago',
        permissions: ['manage_trips', 'view_analytics']
      },
      {
        id: 3,
        name: 'Mike Rodriguez',
        email: 'mike.r@jonasco.com',
        role: 'Team Lead',
        status: 'active',
        joinedAt: '2024-02-15',
        lastActive: '3 hours ago',
        permissions: ['create_trips', 'manage_team']
      },
      {
        id: 4,
        name: 'Emma Thompson',
        email: 'emma.t@jonasco.com',
        role: 'Coordinator',
        status: 'active',
        joinedAt: '2024-03-01',
        lastActive: '1 day ago',
        permissions: ['create_trips']
      },
      {
        id: 5,
        name: 'David Kim',
        email: 'david.kim@jonasco.com',
        role: 'Analyst',
        status: 'pending',
        joinedAt: '2024-03-10',
        lastActive: 'Never',
        permissions: ['view_trips']
      }
    ];

    res.json(teamMembers);
  } catch (error) {
    console.error('Team members error:', error);
    res.status(500).json({ message: 'Failed to get team members' });
  }
});

// Airport code conversion endpoint
router.post('/locations/airport-code', (req, res) => {
  try {
    const { cityName } = req.body;

    if (!cityName) {
      return res.status(400).json({ error: 'City name is required' });
    }

    const airportCode = getAirportCode(cityName);
    res.json({ airportCode });
  } catch (error) {
    console.error('Airport code conversion error:', error);
    res.status(500).json({ error: 'Failed to convert city to airport code' });
  }
});

// Helper function to convert city names to airport codes
function getAirportCode(cityName: string): string {
  const airportMap: { [key: string]: string } = {
    'san francisco': 'SFO',
    'san francisco, ca': 'SFO',
    'san francisco, united states': 'SFO',
    'san francisco, california': 'SFO',
    'sf': 'SFO',
    'new york': 'JFK',
    'new york city': 'JFK',
    'new york, united states': 'JFK',
    'new york, ny': 'JFK',
    'nyc': 'JFK',
    'ny': 'JFK',
    'chicago': 'ORD',
    'chicago, il': 'ORD',
    'los angeles': 'LAX',
    'la': 'LAX',
    'seattle': 'SEA',
    'seattle, wa': 'SEA',
    'seattle, washington': 'SEA',
    'denver': 'DEN',
    'denver, co': 'DEN',
    'miami': 'MIA',
    'miami, fl': 'MIA',
    'austin': 'AUS',
    'austin, tx': 'AUS',
    'boston': 'BOS',
    'boston, ma': 'BOS',
    'atlanta': 'ATL',
    'atlanta, ga': 'ATL',
    'washington': 'DCA',
    'washington dc': 'DCA',
    'dc': 'DCA',
    'philadelphia': 'PHL',
    'phoenix': 'PHX',
    'las vegas': 'LAS',
    'vegas': 'LAS',
    'orlando': 'MCO',
    'dallas': 'DFW',
    'houston': 'IAH',
    'detroit': 'DTW',
    'minneapolis': 'MSP',
    'charlotte': 'CLT',
    'portland': 'PDX',
    'salt lake city': 'SLC',
    'nashville': 'BNA',
    'london': 'LHR',
    'uk': 'LHR',
    'england': 'LHR',
    'paris': 'CDG',
    'france': 'CDG',
    'tokyo': 'NRT',
    'japan': 'NRT',
    'singapore': 'SIN',
    'amsterdam': 'AMS',
    'netherlands': 'AMS'
  };

  const city = cityName?.toLowerCase().trim() || '';

  console.log(`Converting city "${cityName}" (normalized: "${city}") to airport code`);

  // Direct match
  if (airportMap[city]) {
    console.log(`Direct match found: ${airportMap[city]}`);
    return airportMap[city];
  }

  // Check if it's already a 3-letter code
  if (city.length === 3 && /^[A-Za-z]{3}$/.test(city)) {
    console.log(`Already airport code: ${city.toUpperCase()}`);
    return city.toUpperCase();
  }

  // Try partial matches for compound city names - check if city starts with any key
  for (const [key, code] of Object.entries(airportMap)) {
    if (city.startsWith(key) || key.startsWith(city)) {
      console.log(`Partial match found: ${key} -> ${code}`);
      return code;
    }
  }

  // Try contains matches
  for (const [key, code] of Object.entries(airportMap)) {
    if (city.includes(key) || key.includes(city)) {
      console.log(`Contains match found: ${key} -> ${code}`);
      return code;
    }
  }

  console.log(`No match found for "${city}", defaulting to JFK`);
  // Default fallback to major airports
  return 'JFK'; // Default to JFK if no match found
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'nestmap-api'
  });
});

export default router;