import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import debugRoutes from './debug';
import tripRoutes from './trips';
import activityRoutes from './activities';
import organizationRoutes from './organizations';
import analyticsRoutes from './analytics';
// Performance routes registered in main server file
import adminRoutes from './admin';
import calendarRoutes from './calendar';
import collaborationRoutes from './collaboration';
import { registerBookingRoutes } from './bookings';
import approvalRoutes from './approvals';
import expenseRoutes from './expenses';
import reportingRoutes from './reporting';
import { registerCorporateCardRoutes } from './corporateCards';
import organizationFundingRoutes from './organizationFunding';
import stripeOAuthRoutes from './stripeOAuth';
import superadminRoutes from './superadmin';
import webhookRoutes from './webhooks';
import subscriptionStatusRoutes from './subscription-status';
import { registerAdminSettingsRoutes } from './admin-settings';
import todosRoutes from './todos';
import notesRoutes from './notes';
import aiRoutes from './ai';
import securityRoutes from './security';
import healthRoutes from './health';
import notificationsRoutes from './notifications';
import flightRoutes from './flights';
import weatherRoutes from './weather';
import travelPoliciesRoutes from './travelPolicies';
import enterpriseExpensesRoutes from './enterpriseExpenses';
// Removed duty of care and ground transport - no real APIs available
import teamCollaborationRoutes from './teamCollaboration';
import workspaceIntegrationRoutes from './workspaceIntegration';
import aiBookingRecommendationsRoutes from './aiBookingRecommendations';
import mobileRoutes from './mobile';
import demoRoutes from './demo';
import { getUserById } from '../auth';
import viatorRoutes from './viator';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/debug', debugRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/analytics', analyticsRoutes);
// Performance routes registered separately as function
router.use('/admin', adminRoutes);
router.use('/calendar', calendarRoutes);
router.use('/collaboration', collaborationRoutes);
// Register booking routes directly to app instance (not router)
// Note: This will be handled in the main routes file
router.use('/approvals', approvalRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reporting', reportingRoutes);
// Corporate cards routes registered directly to app in main server file
router.use('/organization-funding', organizationFundingRoutes);
console.log('🔧 Mounting Stripe OAuth routes at /stripe');
router.use('/stripe', stripeOAuthRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/subscription-status', subscriptionStatusRoutes);
router.use('/security', securityRoutes);
router.use('/health', healthRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/flights', flightRoutes);

// Import and register simplified white label routes
import { registerSimplifiedWhiteLabelRoutes } from './whiteLabelSimplified';
// Note: This will be handled in the main server file since it needs the app instance
router.use('/todos', todosRoutes);
router.use('/notes', notesRoutes);
router.use('/ai', aiRoutes);
router.use('/weather', weatherRoutes);
router.use('/travel-policies', travelPoliciesRoutes);
router.use('/enterprise-expenses', enterpriseExpensesRoutes);
// Removed duty of care and ground transport routes
router.use('/team-collaboration', teamCollaborationRoutes);
router.use('/workspace-integration', workspaceIntegrationRoutes);
router.use('/ai-recommendations', aiBookingRecommendationsRoutes);
router.use('/mobile', mobileRoutes);
router.use('/demo', demoRoutes);
router.use('/viator', viatorRoutes);

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

// User permissions endpoint - requires authentication
router.get('/user/permissions', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Debug logging
    console.log('User permissions request:', {
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      isDemo: req.isDemo,
      organizationId: req.user.organization_id
    });

    // Special handling for demo users
    if (req.isDemo || req.user.email?.includes('.demo') || req.user.username?.startsWith('demo-')) {
      // Give demo users full permissions for their role
      const demoPermissions = req.user.role === 'admin' 
        ? ['manage_trips', 'manage_users', 'manage_organization', 'view_analytics', 'manage_billing', 'export_data']
        : req.user.role === 'manager'
        ? ['manage_trips', 'manage_team', 'view_analytics', 'export_data']
        : ['manage_trips', 'view_trips'];
        
      return res.json({ 
        permissions: demoPermissions,
        role: req.user.role,
        organizationId: req.user.organization_id,
        isDemo: true
      });
    }

    // Get user's actual permissions from database based on role
    const { getUserPermissionsByRole } = await import('../permissions');
    const permissions = await getUserPermissionsByRole(req.user.id, req.user.role, req.user.organization_id);

    res.json({ 
      permissions,
      role: req.user.role,
      organizationId: req.user.organization_id
    });
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ message: 'Failed to get permissions' });
  }
});

// Dashboard stats endpoint
router.get('/dashboard-stats', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Allow demo users even without organization_id
  const isDemo = req.isDemo || req.user.email?.includes('.demo') || req.user.username?.startsWith('demo-');
  if (!isDemo && !req.user.organization_id) {
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

// Airport code conversion endpoint with AI
router.post('/locations/airport-code', async (req, res) => {
  try {
    const { cityName } = req.body;

    if (!cityName) {
      return res.status(400).json({ error: 'City name is required' });
    }

    // Check if it's already an airport code
    if (cityName.length === 3 && /^[A-Z]{3}$/i.test(cityName)) {
      return res.json({ airportCode: cityName.toUpperCase() });
    }

    // Use AI to find the nearest major airport
    try {
      const { callOpenAI } = await import('../openai');
      
      const prompt = `Find the closest major commercial airport to ${cityName}. Consider:
1. If it's a major city with multiple airports, return the main international airport
2. If it's a smaller city, return the nearest major airport with good flight connections
3. Consider practical travel distance - the airport people would actually use

City: ${cityName}

Return ONLY the 3-letter IATA airport code (e.g., LAX, JFK, ORD). Nothing else.`;

      const aiResponse = await callOpenAI(prompt, { temperature: 0.1, max_tokens: 10 });
      const airportCode = aiResponse.trim().toUpperCase().replace(/[^A-Z]/g, '');
      
      // Validate it's a 3-letter code
      if (/^[A-Z]{3}$/.test(airportCode)) {
        console.log(`AI found airport code for ${cityName}: ${airportCode}`);
        return res.json({ airportCode });
      } else {
        console.error(`Invalid airport code from AI: ${aiResponse}`);
      }
    } catch (aiError) {
      console.error('AI airport lookup failed:', aiError);
    }

    // Last resort fallback - ask AI for a major US hub
    try {
      const { callOpenAI } = await import('../openai');
      const fallbackResponse = await callOpenAI('What is the airport code for a major US hub airport? Return only the 3-letter code.', { temperature: 0.1, max_tokens: 10 });
      const fallbackCode = fallbackResponse.trim().toUpperCase().replace(/[^A-Z]/g, '');
      if (/^[A-Z]{3}$/.test(fallbackCode)) {
        return res.json({ airportCode: fallbackCode });
      }
    } catch (e) {
      // Silent fail
    }

    // Ultimate fallback
    res.json({ airportCode: 'ORD' }); // Chicago O'Hare as a central US hub
  } catch (error) {
    console.error('Airport code conversion error:', error);
    res.status(500).json({ error: 'Failed to convert city to airport code' });
  }
});


// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'remvana-api'
  });
});

// Function to register admin settings routes that need app instance
export function registerDirectRoutes(app: any) {
  registerAdminSettingsRoutes(app);
}

export default router;