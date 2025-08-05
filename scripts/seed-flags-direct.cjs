const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function seedFlags() {
  const postgres = require('postgres');
  
  const sql = postgres(DATABASE_URL);

  const flags = [
    // AI Features
    { flag_name: 'ai_trip_generation', description: 'Enable AI-powered trip generation and planning', default_value: true },
    { flag_name: 'ai_day_summarization', description: 'Enable AI daily activity summaries', default_value: true },
    { flag_name: 'ai_food_recommendations', description: 'Enable AI restaurant and cuisine suggestions', default_value: true },
    { flag_name: 'ai_activity_suggestions', description: 'Enable AI-generated activity recommendations', default_value: true },
    { flag_name: 'ai_content_translation', description: 'Enable multi-language content translation', default_value: true },
    { flag_name: 'ai_predictive_insights', description: 'Enable AI predictions for travel planning', default_value: true },

    // Flight Features
    { flag_name: 'flight_search', description: 'Enable real-time flight search via Duffel API', default_value: true },
    { flag_name: 'flight_booking', description: 'Enable complete flight booking workflow', default_value: true },
    { flag_name: 'multi_booking_providers', description: 'Enable multiple flight booking providers (Duffel, Kiwi, Amadeus)', default_value: false },

    // Corporate Card Features
    { flag_name: 'corporate_cards', description: 'Enable Stripe Issuing corporate card management', default_value: true },
    { flag_name: 'virtual_cards', description: 'Enable virtual corporate card issuance', default_value: true },
    { flag_name: 'spending_controls', description: 'Enable advanced spending controls and limits', default_value: true },
    { flag_name: 'real_time_transactions', description: 'Enable real-time transaction monitoring', default_value: true },

    // White Label Features
    { flag_name: 'white_label', description: 'Enable white label customization features', default_value: true },
    { flag_name: 'custom_domains', description: 'Enable custom domain configuration', default_value: true },
    { flag_name: 'custom_branding', description: 'Enable logo and theme customization', default_value: true },

    // Email & Notifications
    { flag_name: 'email_notifications', description: 'Enable SendGrid email notifications', default_value: true },
    { flag_name: 'push_notifications', description: 'Enable browser push notifications', default_value: true },
    { flag_name: 'notification_center', description: 'Enable in-app notification center', default_value: true },

    // Calendar Integration
    { flag_name: 'calendar_sync', description: 'Enable calendar synchronization', default_value: true },
    { flag_name: 'google_calendar', description: 'Enable Google Calendar integration', default_value: true },
    { flag_name: 'outlook_calendar', description: 'Enable Outlook Calendar integration', default_value: true },
    { flag_name: 'ical_export', description: 'Enable iCal file export', default_value: true },

    // Collaboration Features
    { flag_name: 'real_time_collaboration', description: 'Enable WebSocket-powered live editing', default_value: true },
    { flag_name: 'trip_comments', description: 'Enable commenting on trips and activities', default_value: true },
    { flag_name: 'team_management', description: 'Enable multi-user trip collaboration', default_value: true },
    { flag_name: 'trip_sharing', description: 'Enable external trip sharing', default_value: true },

    // Expense Management
    { flag_name: 'expense_tracking', description: 'Enable detailed expense categorization', default_value: true },
    { flag_name: 'carbon_footprint', description: 'Enable environmental impact tracking', default_value: true },
    { flag_name: 'approval_workflows', description: 'Enable multi-level expense approvals', default_value: true },
    { flag_name: 'receipt_management', description: 'Enable digital receipt storage', default_value: true },

    // Analytics Features
    { flag_name: 'trip_analytics', description: 'Enable detailed trip performance metrics', default_value: true },
    { flag_name: 'organization_analytics', description: 'Enable company-wide travel insights', default_value: true },
    { flag_name: 'custom_reports', description: 'Enable custom report generation', default_value: true },
    { flag_name: 'data_export', description: 'Enable analytics data export', default_value: true },

    // Map Features
    { flag_name: 'interactive_maps', description: 'Enable Mapbox-powered interactive mapping', default_value: true },
    { flag_name: 'route_visualization', description: 'Enable trip route mapping', default_value: true },
    { flag_name: 'location_search', description: 'Enable places search and autocomplete', default_value: true },

    // Mobile Features
    { flag_name: 'pwa_support', description: 'Enable Progressive Web App features', default_value: true },
    { flag_name: 'offline_mode', description: 'Enable offline functionality', default_value: true },
    { flag_name: 'mobile_app', description: 'Enable native mobile app features', default_value: false },

    // Document Features
    { flag_name: 'pdf_export', description: 'Enable trip itinerary PDF export', default_value: true },
    { flag_name: 'proposal_generation', description: 'Enable professional trip proposals', default_value: true },
    { flag_name: 'digital_signatures', description: 'Enable digital signature collection', default_value: false },

    // Weather Integration
    { flag_name: 'weather_forecasts', description: 'Enable location-based weather information', default_value: true },
    { flag_name: 'weather_suggestions', description: 'Enable weather-based activity recommendations', default_value: true },

    // Booking Features
    { flag_name: 'hotel_booking', description: 'Enable hotel booking via Booking.com API', default_value: true },
    { flag_name: 'multi_service_booking', description: 'Enable unified booking across services', default_value: true },

    // Advanced Features
    { flag_name: 'trip_optimization', description: 'Enable AI-powered trip optimization', default_value: true },
    { flag_name: 'cost_optimization', description: 'Enable budget optimization suggestions', default_value: true },
    { flag_name: 'performance_monitoring', description: 'Enable application performance monitoring', default_value: true },
    { flag_name: 'advanced_security', description: 'Enable advanced security features', default_value: true },
    { flag_name: 'beta_features', description: 'Enable access to beta features', default_value: false }
  ];

  try {
    console.log('🚀 Starting feature flags seeding...');
    console.log(`Connected to database`);

    // Clear existing feature flags
    await sql`DELETE FROM feature_flags`;
    console.log('✅ Cleared existing feature flags');

    // Insert new feature flags
    for (const flag of flags) {
      await sql`
        INSERT INTO feature_flags (flag_name, description, default_value)
        VALUES (${flag.flag_name}, ${flag.description}, ${flag.default_value})
      `;
      console.log(`✅ Added flag: ${flag.flag_name}`);
    }

    console.log(`\n✨ Successfully seeded ${flags.length} feature flags!`);
    console.log('Feature flags are now available in the superadmin dashboard.');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding feature flags:', error);
    await sql.end();
    process.exit(1);
  }
}

seedFlags();