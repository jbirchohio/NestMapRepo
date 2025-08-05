import { Router } from 'express';
import { aiBookingRecommendationService } from '../services/aiBookingRecommendationService';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';

const router = Router();

// Apply auth and organization context to all routes
router.use(jwtAuthMiddleware);
router.use(requireOrganizationContext);

// Get AI recommendations for a trip
router.post('/recommendations', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { origin, destination, startDate, endDate, context } = req.body;

    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Origin, destination, startDate, and endDate are required' 
      });
    }

    const recommendations = await aiBookingRecommendationService.getRecommendations(
      req.user.id,
      req.organizationContext.id,
      {
        origin,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        context: context || {
          purpose: 'business',
          attendees: 1,
          flexibility: 'medium'
        }
      }
    );

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Learn user preferences
router.get('/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const preferences = await aiBookingRecommendationService.learnUserPreferences(
      req.user.id
    );

    res.json(preferences);
  } catch (error) {
    console.error('Error learning preferences:', error);
    res.status(500).json({ error: 'Failed to learn preferences' });
  }
});

// Get quick recommendations based on common routes
router.get('/quick-recommendations', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // This would analyze common routes and provide quick booking options
    // For now, return mock data
    const quickRecs = {
      commonRoutes: [
        {
          route: 'SFO → NYC',
          lastBooked: '2 weeks ago',
          averagePrice: 425,
          quickBookOptions: [
            {
              departure: 'Tomorrow 8:00 AM',
              return: 'Friday 6:00 PM',
              price: 380,
              airline: 'United',
              bookingUrl: '/book/quick/sfo-nyc-1'
            }
          ]
        },
        {
          route: 'LAX → CHI',
          lastBooked: '1 month ago',
          averagePrice: 350,
          quickBookOptions: []
        }
      ],
      upcomingConferences: [
        {
          name: 'SaaS Conference 2025',
          location: 'Austin, TX',
          dates: 'March 15-18, 2025',
          estimatedCost: 2800,
          bookByDate: 'February 15, 2025'
        }
      ],
      seasonalTips: [
        'Book Q2 travel now for 20% savings',
        'Hurricane season approaching - consider travel insurance for Florida trips',
        'European summer rates increasing - book by March for best prices'
      ]
    };

    res.json(quickRecs);
  } catch (error) {
    console.error('Error getting quick recommendations:', error);
    res.status(500).json({ error: 'Failed to get quick recommendations' });
  }
});

// Compare booking options
router.post('/compare', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { options } = req.body;

    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 options required for comparison' 
      });
    }

    // Compare options across multiple dimensions
    const comparison = {
      priceComparison: {
        lowest: Math.min(...options.map(o => o.price)),
        highest: Math.max(...options.map(o => o.price)),
        average: options.reduce((sum, o) => sum + o.price, 0) / options.length
      },
      convenienceScore: options.map(o => ({
        option: o.name,
        score: calculateConvenienceScore(o)
      })),
      policyCompliance: options.map(o => ({
        option: o.name,
        compliant: o.policyCompliant,
        violations: o.violations || []
      })),
      recommendation: {
        best_value: options.find(o => o.score === Math.max(...options.map(opt => opt.score))),
        most_convenient: options.find(o => 
          calculateConvenienceScore(o) === Math.max(...options.map(calculateConvenienceScore))
        ),
        most_economical: options.find(o => o.price === Math.min(...options.map(opt => opt.price)))
      },
      insights: [
        'Direct flights save an average of 2.5 hours despite 15% higher cost',
        'Corporate rates available for 60% of options',
        'Booking 14+ days in advance saves an average of $125'
      ]
    };

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing options:', error);
    res.status(500).json({ error: 'Failed to compare options' });
  }
});

// Helper function to calculate convenience score
function calculateConvenienceScore(option: any): number {
  let score = 50;
  
  // Flight factors
  if (option.type === 'flight') {
    if (option.stops === 0) score += 20;
    if (option.duration < 180) score += 15;
    if (option.departureTime && option.departureTime.includes('AM')) score += 5;
  }
  
  // Hotel factors
  if (option.type === 'hotel') {
    if (option.location?.includes('Downtown')) score += 15;
    if (option.amenities?.includes('Business Center')) score += 10;
    if (option.amenities?.includes('Free WiFi')) score += 5;
  }
  
  // Ground transport factors
  if (option.type === 'transport') {
    if (option.subtype === 'rental_car') score += 15;
    if (option.subtype === 'rideshare') score += 10;
  }
  
  return Math.min(100, score);
}

export default router;