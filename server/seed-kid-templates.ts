import 'dotenv/config';
import { db } from './db';
import { templates, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getOpenAIClient } from './services/openaiClient';

// Template configurations for kid-friendly family trips - 10 templates
const kidFriendlyTemplates = [
  {
    city: 'Orlando',
    country: 'USA',
    price: 19.99,
    budgetLevel: 'mid',
    dailyBudget: 150,
    title: 'Orlando Magic Beyond Disney: Family Fun on a Budget',
    description: 'Discover Orlando\'s hidden family gems beyond the theme parks. Free splash pads, nature parks, and kid-friendly restaurants that won\'t break the bank.'
  },
  {
    city: 'San Diego',
    country: 'USA', 
    price: 22.99,
    budgetLevel: 'mid',
    dailyBudget: 175,
    title: 'San Diego Family Beach Adventure',
    description: 'Perfect family beaches, tide pools, Balboa Park playgrounds, and the world-famous zoo. Kid-tested, parent-approved itinerary.'
  },
  {
    city: 'Washington DC',
    country: 'USA',
    price: 14.99,
    budgetLevel: 'budget',
    dailyBudget: 100,
    title: 'DC Kids: Museums, Monuments & Fun',
    description: 'Free Smithsonian museums with hands-on exhibits, National Zoo pandas, and monuments that make history exciting for kids.'
  },
  {
    city: 'Chicago',
    country: 'USA',
    price: 17.99,
    budgetLevel: 'mid',
    dailyBudget: 140,
    title: 'Chicago Family Fun: Museums & Pizza',
    description: 'Navy Pier, Children\'s Museum, Millennium Park splash pad, and deep-dish pizza. Perfect for families with kids 5-12.'
  },
  {
    city: 'Boston',
    country: 'USA',
    price: 18.99,
    budgetLevel: 'mid',
    dailyBudget: 160,
    title: 'Boston Duck Tours & History for Kids',
    description: 'Walk the Freedom Trail with kid-friendly stops, ride the Swan Boats, explore the Children\'s Museum, and eat at Faneuil Hall.'
  },
  {
    city: 'Los Angeles',
    country: 'USA',
    price: 21.99,
    budgetLevel: 'mid',
    dailyBudget: 170,
    title: 'LA Family: Beaches, Studios & Stars',
    description: 'Santa Monica Pier, Griffith Observatory, Universal Studios tips, and family-friendly Hollywood experiences.'
  },
  {
    city: 'Seattle',
    country: 'USA',
    price: 16.99,
    budgetLevel: 'mid',
    dailyBudget: 140,
    title: 'Seattle Kids: Science & Sea Adventures',
    description: 'Pacific Science Center, Pike Place Market treasure hunt, ferry rides, and the Children\'s Museum. Rain or shine activities included!'
  },
  {
    city: 'Nashville',
    country: 'USA',
    price: 13.99,
    budgetLevel: 'budget',
    dailyBudget: 110,
    title: 'Nashville Family: Music City for Mini-Mes',
    description: 'Kid-friendly honky-tonks, Adventure Science Center, Nashville Zoo, and family BBQ spots. Country music fun for all ages.'
  },
  {
    city: 'Phoenix',
    country: 'USA',
    price: 15.99,
    budgetLevel: 'mid',
    dailyBudget: 130,
    title: 'Phoenix Desert Fun for Families',
    description: 'Desert Botanical Garden, Children\'s Museum, splash pads, and easy hiking trails perfect for little legs. Beat the heat tips included!'
  },
  {
    city: 'Atlanta',
    country: 'USA',
    price: 14.99,
    budgetLevel: 'budget',
    dailyBudget: 120,
    title: 'Atlanta Family Adventure: Aquarium to Zoo',
    description: 'World\'s largest aquarium, Zoo Atlanta pandas, Children\'s Museum, and Centennial Olympic Park splash pad. Southern hospitality for families.'
  }
];

async function seedKidFriendlyTemplates() {
  console.log('🌱 Starting kid-friendly template generation...');

  try {
    // Find or create Remvana user
    let remvanaUser = await db.select()
      .from(users)
      .where(eq(users.username, 'Remvana'))
      .limit(1);

    if (remvanaUser.length === 0) {
      const [newUser] = await db.insert(users)
        .values({
          auth_id: 'remvana_system',
          username: 'Remvana',
          email: 'templates@remvana.com',
          display_name: 'Remvana Official',
          role: 'admin',
          creator_status: 'verified',
          creator_tier: 'partner',
          creator_verified_at: new Date(),
          creator_bio: 'Official Remvana account for family-friendly travel templates',
        })
        .returning();
      remvanaUser = [newUser];
      console.log('✅ Created Remvana user');
    }

    const remvanaUserId = remvanaUser[0].id;
    console.log(`📝 Using Remvana user ID: ${remvanaUserId}`);

    // Generate each template
    for (const config of kidFriendlyTemplates) {
      console.log(`\n🏗️ Generating template for ${config.city}...`);

      // Determine duration based on price
      let duration: number;
      if (config.price <= 15) {
        duration = 3; // Weekend trip
      } else if (config.price <= 18) {
        duration = 4; // Long weekend
      } else {
        duration = 5; // Work week trip
      }

      const totalBudget = config.dailyBudget * duration;

      // Generate AI itinerary
      const prompt = `Create a detailed ${duration}-day kid-friendly family travel itinerary for ${config.city}, ${config.country}.
      
      Budget Information:
      - Total budget: $${totalBudget} USD (${duration} days × $${config.dailyBudget}/day)
      - Budget level: ${config.budgetLevel}
      - Focus on activities suitable for children ages 4-12
      - Include nap times and rest breaks
      
      The itinerary should include:
      - Kid-friendly attractions and activities
      - Interactive museums and hands-on experiences
      - Playgrounds and outdoor spaces
      - Family-friendly restaurants with kids menus
      - Early dinner times (5-6 PM)
      - Mix of educational and fun activities
      - Indoor backup options for bad weather
      - Stroller-friendly locations
      - At least 4-5 activities per day with specific times
      - Exact costs for each activity (many should be free or low-cost)
      
      Format the response as a JSON object with this structure:
      {
        "tripSummary": {
          "overview": "Comprehensive overview of the family trip (3-4 sentences)",
          "highlights": ["highlight1", "highlight2", "highlight3", "highlight4", "highlight5"],
          "totalBudget": ${totalBudget},
          "dailyBudget": ${config.dailyBudget},
          "budgetLevel": "${config.budgetLevel}",
          "ageRange": "4-12 years",
          "familySize": "2 adults, 2 children"
        },
        "budgetBreakdown": {
          "accommodation": ${Math.round(totalBudget * 0.35)},
          "food": ${Math.round(totalBudget * 0.30)},
          "activities": ${Math.round(totalBudget * 0.20)},
          "transportation": ${Math.round(totalBudget * 0.10)},
          "shopping": ${Math.round(totalBudget * 0.05)}
        },
        "activities": [
          {
            "day": 1,
            "date": "Day 1",
            "title": "Kid-friendly activity name",
            "time": "9:00 AM",
            "location_name": "Specific location or address",
            "description": "Detailed activity description focusing on what kids will love",
            "duration": "2 hours",
            "tips": "Parent tips and what to bring",
            "category": "family|museum|outdoor|playground|dining|entertainment",
            "estimatedCost": 0,
            "costNotes": "FREE or cost per family of 4",
            "kidFriendly": true,
            "ageAppropriate": "4-12",
            "strollerFriendly": true
          }
        ],
        "recommendations": {
          "bestTimeToVisit": "Family-friendly seasonal recommendations",
          "gettingAround": "Transportation with kids (car seats, strollers, etc)",
          "whereToStay": "Family-friendly neighborhoods and hotels with pools",
          "localTips": ["family tip 1", "family tip 2", "family tip 3"],
          "kidTips": ["keep kids happy tip 1", "nap time strategy", "snack recommendations"],
          "restaurantTips": ["kid-friendly spot 1", "kids eat free location", "best ice cream"],
          "rainyDayOptions": ["indoor activity 1", "indoor activity 2", "indoor activity 3"],
          "playgrounds": ["best playground 1", "splash pad location", "park with playground"],
          "babyChanging": ["locations with changing tables", "family restroom spots"],
          "strollerTips": ["stroller-friendly areas", "where to rent strollers"]
        }
      }`;

      try {
        const openaiClient = getOpenAIClient();
        const response = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a family travel expert creating kid-friendly itineraries for families with young children. Focus on fun, educational, and age-appropriate activities with plenty of breaks. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 4000,
        });

        let content = response.choices[0].message.content || '{}';
        // Remove markdown code blocks if present
        content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const generatedItinerary = JSON.parse(content);

        // Create slug
        const slug = config.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + Date.now();

        // Format trip data
        const tripData: any = {
          title: config.title,
          description: config.description,
          city: config.city,
          country: config.country,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          duration,
          activities: generatedItinerary.activities.map((activity: any, index: number) => ({
            id: `gen-${index}`,
            trip_id: 0,
            title: activity.title,
            date: `Day ${activity.day}`,
            time: activity.time,
            location_name: activity.location_name,
            description: activity.description,
            notes: activity.tips,
            tag: activity.category || 'family',
            order: index,
            price: activity.estimatedCost || 0,
            cost_notes: activity.costNotes || '',
            kid_friendly: true,
            age_appropriate: activity.ageAppropriate || '4-12',
            stroller_friendly: activity.strollerFriendly !== false,
          })),
          recommendations: generatedItinerary.recommendations,
          highlights: generatedItinerary.tripSummary.highlights,
          budget_estimate: totalBudget,
          budget: {
            total: totalBudget,
            daily: config.dailyBudget,
            level: config.budgetLevel,
            breakdown: generatedItinerary.budgetBreakdown,
            currency: 'USD',
            familySize: '2 adults, 2 children',
            tips: {
              kidTips: generatedItinerary.recommendations.kidTips || [],
              rainyDayOptions: generatedItinerary.recommendations.rainyDayOptions || [],
              playgrounds: generatedItinerary.recommendations.playgrounds || [],
            }
          },
          generatedAt: new Date().toISOString(),
        };

        // Determine tags
        const tags = ['kid-friendly', 'family-travel', 'children-activities'];
        if (duration <= 3) tags.push('weekend-trip');
        if (duration >= 5) tags.push('week-long');
        if (config.city === 'Orlando' || config.city === 'San Diego') tags.push('theme-parks');
        if (config.city === 'San Diego' || config.city === 'Los Angeles') tags.push('beach');
        if (config.budgetLevel === 'budget') tags.push('budget-friendly');

        // Create template
        const [newTemplate] = await db.insert(templates)
          .values({
            title: config.title,
            slug,
            description: config.description,
            user_id: remvanaUserId,
            trip_data: tripData,
            destinations: [config.city, config.country],
            tags,
            duration,
            price: config.price.toString(),
            currency: 'USD',
            status: 'published',
            ai_generated: false, // Don't mark as AI generated
            featured: true, // Feature kid-friendly templates
            cover_image: null, // Could add Unsplash integration
            view_count: Math.floor(Math.random() * 150) + 75, // Seed with some views
            sales_count: Math.floor(Math.random() * 30) + 10, // Seed with some sales
          })
          .returning();

        console.log(`✅ Created template: ${config.title} (ID: ${newTemplate.id})`);

      } catch (error) {
        console.error(`❌ Failed to generate template for ${config.city}:`, error);
      }

      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n🎉 Kid-friendly template seeding complete!');
    console.log(`📊 Created ${kidFriendlyTemplates.length} family-friendly templates`);

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await db.$client.end();
  }
}

// Run the seeding
seedKidFriendlyTemplates();