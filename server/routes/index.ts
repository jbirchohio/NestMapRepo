import type { Router } from '../../express-augmentations.ts';
// Core routes
import { authRouter as authRoutes } from '../src/auth/auth.routes.js';
import proposalsRoutes from './proposals.js';
import tripRoutes from './trips.js';
import activityRoutes from './activities.js';
import organizationRoutes from './organizations.js';
import analyticsRoutes from './analytics.js';
import paymentsRoutes from './payments.js';
import { registerWhiteLabelStatusRoutes } from './whiteLabelStatus.js';
// Feature routes
import adminRoutes from './admin.js';
import invoicesRoutes from './invoices.js';
import calendarRoutes from './calendar.js';
import { registerBookingRoutes } from './bookings.js';
import approvalRoutes from './approvals.js';
import expenseRoutes from './expenses.js';
import reportingRoutes from './reporting.js';
import { registerCorporateCardRoutes } from './corporateCards.js';
import organizationFundingRoutes from './organizationFunding.js';
import stripeOAuthRoutes from './stripeOAuth.js';
// Import modular superadmin routes
import superadminRoutes from './superadmin/index.js';
import webhookRoutes from './webhooks.js';
import subscriptionStatusRoutes from './subscription-status.js';
import { registerAdminSettingsRoutes } from './admin-settings.js';
import aiRoutes from './ai.js';
import billingRoutes from './billing.js';
import securityRoutes from './security.js';
import healthRoutes from './health.js';
import notificationsRoutes from './notifications.js';
import flightRoutes from './flights.js';
import exportRoutes from './export.js';
// Test routes (development only)
import testRoutes from './test.routes.js';
const router = Router();
// Mount all route modules
router.use('/auth', authRoutes);
router.use('/proposals', proposalsRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/analytics', analyticsRoutes);
// Register routes that need the router instance
// Mount admin and feature routes
router.use('/admin', adminRoutes);
import customDomainsRoutes from './customDomains.js';
router.use('/calendar', calendarRoutes);
router.use('/approvals', approvalRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reporting', reportingRoutes);
router.use('/organization-funding', organizationFundingRoutes);
router.use('/stripe', stripeOAuthRoutes);
router.use('/custom-domains', customDomainsRoutes);
// Mount test routes in development only
if (process.env.NODE_ENV === 'development') {
    router.use('/test', testRoutes);
    console.log(' Mounting Test routes at /test');
}
// Mount superadmin routes with proper middleware
router.use('/superadmin', superadminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/subscription-status', subscriptionStatusRoutes);
router.use('/security', securityRoutes);
router.use('/health', healthRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/flights', flightRoutes);
router.use('/export', exportRoutes);
// Import and register simplified white label routes
import { registerSimplifiedWhiteLabelRoutes } from './whiteLabelSimplified.js';
// Note: This will be handled in the main server file since it needs the app instance
// router.use('/todos', todosRoutes);
// router.use('/notes', notesRoutes);
router.use('/ai', aiRoutes);
router.use('/billing', billingRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/payments', paymentsRoutes);
// Templates endpoint
router.get('/templates', async (_req, res) => {
    try {
        const { getAllTemplates } = await import('../tripTemplates.js');
        const templates = getAllTemplates();
        res.json(templates);
    }
    catch (error) {
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
        // Get user's actual permissions from database based on role
        const { getUserPermissionsByRole } = await import('../permissions.js');
        let parsedOrganizationId: number | undefined;
        if (req.user.organizationId != null) { // Check if it's not null or undefined
            parsedOrganizationId = parseInt(req.user.organizationId, 10);
            if (isNaN(parsedOrganizationId)) {
                console.error('Invalid organizationId format:', req.user.organizationId);
                return res.status(400).json({ message: 'Invalid organization ID format' });
            }
        }
        else {
            parsedOrganizationId = undefined;
        }
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            console.error('Invalid userId format:', req.user.id);
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        const permissions = await getUserPermissionsByRole(userId, req.user.role, parsedOrganizationId);
        res.json({
            permissions,
            role: req.user.role,
            organizationId: req.user.organizationId // Keep original string/null for response
        });
        return;
    }
    catch (error) {
        console.error('Permissions error:', error);
        res.status(500).json({ message: 'Failed to get permissions' });
        return;
    }
});
// Dashboard stats endpoint
router.get('/dashboard-stats', (req, res) => {
    if (!req.user || !req.user.organizationId) {
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
    return;
});
// Team members endpoint for JonasCo
router.get('/organizations/members', async (_req, res) => {
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
    }
    catch (error) {
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
        return;
    }
    catch (error) {
        console.error('Airport code conversion error:', error);
        res.status(500).json({ error: 'Failed to convert city to airport code' });
        return;
    }
});
// Helper function to convert city names to airport codes
function getAirportCode(cityName: string): string {
    const airportMap: {
        [key: string]: string;
    } = {
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
router.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'nestmap-api'
    });
});
// Function to register admin settings routes that need app instance
export function registerDirectRoutes(app: any) {
    registerAdminSettingsRoutes(app);
    registerWhiteLabelStatusRoutes(app);
    registerSimplifiedWhiteLabelRoutes(app); // Call the imported function
    registerBookingRoutes(app);
    registerCorporateCardRoutes(app);
}
export default router;
