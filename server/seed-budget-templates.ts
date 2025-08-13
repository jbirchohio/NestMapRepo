import 'dotenv/config';
import { db } from './db';
import { templates, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getOpenAIClient } from './services/openaiClient';

// Template configurations for budget-focused trips - 10 templates
const budgetTemplates = [
  {
    city: 'New York City',
    country: 'USA',
    price: 8.99,
    budgetLevel: 'budget',
    dailyBudget: 50,
    title: 'NYC on a Shoestring: Free Manhattan Magic',
    description: 'Discover NYC\'s best attractions without spending on entrance fees. From free museum days to Central Park secrets, experience the Big Apple for less.'
  },
  {
    city: 'Las Vegas',
    country: 'USA', 
    price: 12.99,
    budgetLevel: 'budget',
    dailyBudget: 60,
    title: 'Vegas Without Gambling: Entertainment Capital Secrets',
    description: 'Experience the Vegas spectacle without losing money. Free shows, happy hours, and natural wonders nearby.'
  },
  {
    city: 'Miami Beach',
    country: 'USA',
    price: 14.99,
    budgetLevel: 'mid',
    dailyBudget: 80,
    title: 'Miami Beach Vibes: Sun, Culture & Salsa',
    description: 'Beach life, Art Deco, Little Havana, and free entertainment. Live the Miami dream without the Miami prices.'
  },
  {
    city: 'Austin',
    country: 'USA',
    price: 9.99,
    budgetLevel: 'budget',
    dailyBudget: 55,
    title: 'Keep Austin Weird on a Budget',
    description: 'Live music, food trucks, and outdoor adventures. Experience Austin\'s unique culture without breaking the bank.'
  },
  {
    city: 'San Francisco',
    country: 'USA',
    price: 15.99,
    budgetLevel: 'mid',
    dailyBudget: 90,
    title: 'SF Broke & Bougie: Golden Gate on a Budget',
    description: 'Navigate SF\'s expensive reputation with insider tricks. Free views, cheap eats in Chinatown, and golden hour magic.'
  },
  {
    city: 'New Orleans',
    country: 'USA',
    price: 11.99,
    budgetLevel: 'budget',
    dailyBudget: 65,
    title: 'NOLA Jazz & Soul for Less',
    description: 'Free music on every corner, happy hour specials, and authentic culture. Let the good times roll without spending your roll.'
  },
  {
    city: 'Portland',
    country: 'USA',
    price: 10.99,
    budgetLevel: 'budget',
    dailyBudget: 60,
    title: 'Portland Hipster Haven Under $200',
    description: 'Food carts, free brewery tours, and urban hiking. Keep Portland weird while keeping your wallet happy.'
  },
  {
    city: 'Washington DC',
    country: 'USA',
    price: 5.99,
    budgetLevel: 'budget',
    dailyBudget: 40,
    title: 'DC Power Trip: Everything\'s Free',
    description: 'Your tax dollars at work! Free Smithsonians, monuments, and Kennedy Center shows. The best things in DC cost nothing.'
  },
  {
    city: 'Seattle',
    country: 'USA',
    price: 11.99,
    budgetLevel: 'budget',
    dailyBudget: 70,
    title: 'Seattle Sleepless & Cheap',
    description: 'Pike Place samples, free park concerts, and happy hour sushi. Coffee culture and mountain views without the price tag.'
  },
  {
    city: 'Denver',
    country: 'USA',
    price: 9.99,
    budgetLevel: 'budget',
    dailyBudget: 60,
    title: 'Mile High on a Low Budget',
    description: 'Red Rocks for free, brewery tours, and urban trails. Get a Rocky Mountain high without altitude pricing.'
  }
];

async function seedBudgetTemplates() {
  console.log('🌱 Starting budget template generation...');

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
          creator_bio: 'Official Remvana account for budget-friendly travel templates',
        })
        .returning();
      remvanaUser = [newUser];
      console.log('✅ Created Remvana user');
    }

    const remvanaUserId = remvanaUser[0].id;
    console.log(`📝 Using Remvana user ID: ${remvanaUserId}`);

    // Generate each template
    for (const config of budgetTemplates) {
      console.log(`\n🏗️ Generating template for ${config.city}...`);

      // Determine duration based on price
      let duration: number;
      if (config.price <= 10) {
        duration = 3; // Weekend trip
      } else if (config.price <= 13) {
        duration = 4; // Long weekend
      } else {
        duration = 5; // Work week trip
      }

      const totalBudget = config.dailyBudget * duration;

      // Generate AI itinerary
      const prompt = `Create a detailed ${duration}-day budget travel itinerary for ${config.city}, ${config.country}.
      
      Budget Information:
      - Total budget: $${totalBudget} USD (${duration} days × $${config.dailyBudget}/day)
      - Budget level: ${config.budgetLevel}
      - Focus on FREE and cheap activities
      - Include specific money-saving tips
      
      The itinerary should include:
      - Mix of FREE attractions and budget-friendly paid activities
      - At least 4-5 activities per day with specific times
      - Detailed descriptions for each activity (2-3 sentences)
      - Cheap local food recommendations ($5-10 meals)
      - Free entertainment and events
      - Budget transportation tips
      - Exact costs for each activity
      
      Format the response as a JSON object with this structure:
      {
        "tripSummary": {
          "overview": "Comprehensive overview of the budget trip (3-4 sentences)",
          "highlights": ["highlight1", "highlight2", "highlight3", "highlight4", "highlight5"],
          "totalBudget": ${totalBudget},
          "dailyBudget": ${config.dailyBudget},
          "budgetLevel": "${config.budgetLevel}"
        },
        "budgetBreakdown": {
          "accommodation": ${Math.round(totalBudget * 0.35)},
          "food": ${Math.round(totalBudget * 0.25)},
          "activities": ${Math.round(totalBudget * 0.25)},
          "transportation": ${Math.round(totalBudget * 0.10)},
          "shopping": ${Math.round(totalBudget * 0.05)}
        },
        "activities": [
          {
            "day": 1,
            "date": "Day 1",
            "title": "Activity name",
            "time": "9:00 AM",
            "location_name": "Specific location or address",
            "description": "Detailed activity description focusing on the experience",
            "duration": "2 hours",
            "tips": "Money-saving tips for this activity",
            "category": "sightseeing|dining|shopping|entertainment|culture|nature",
            "estimatedCost": 0,
            "costNotes": "FREE or explanation of cost"
          }
        ],
        "recommendations": {
          "bestTimeToVisit": "Budget-friendly seasonal recommendations",
          "gettingAround": "Cheapest transportation methods",
          "whereToStay": "Budget accommodation areas (hostels, budget hotels)",
          "localTips": ["budget tip 1", "budget tip 2", "budget tip 3"],
          "budgetTips": ["specific money saving tip 1", "specific money saving tip 2", "specific money saving tip 3"],
          "foodSpecialties": ["cheap local dish 1", "cheap local dish 2", "cheap local dish 3"],
          "freeActivities": ["free activity 1", "free activity 2", "free activity 3", "free activity 4"],
          "splurgeWorthy": ["one splurge item worth the money", "another splurge recommendation"],
          "moneySavingTips": ["hack 1", "hack 2", "hack 3"]
        }
      }`;

      try {
        const openaiClient = getOpenAIClient();
        const response = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a budget travel expert creating affordable itineraries for young travelers, students, and backpackers. Focus on FREE activities, cheap eats, and money-saving hacks. Always respond with valid JSON.'
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
            tag: activity.category || 'sightseeing',
            order: index,
            price: activity.estimatedCost || 0,
            cost_notes: activity.costNotes || '',
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
            tips: {
              moneySaving: generatedItinerary.recommendations.moneySavingTips || [],
              freeActivities: generatedItinerary.recommendations.freeActivities || [],
              splurgeWorthy: generatedItinerary.recommendations.splurgeWorthy || [],
            }
          },
          generatedAt: new Date().toISOString(),
        };

        // Determine tags
        const tags = ['budget-friendly', 'student-travel'];
        if (duration <= 3) tags.push('weekend-trip');
        if (duration >= 5) tags.push('week-long');
        if (config.city === 'New York City' || config.city === 'San Francisco') tags.push('city-break');
        if (config.city === 'Miami Beach') tags.push('beach');
        if (config.city === 'Austin' || config.city === 'Portland') tags.push('hipster');

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
            featured: true, // Feature budget templates
            cover_image: null, // Could add Unsplash integration
            view_count: Math.floor(Math.random() * 100) + 50, // Seed with some views
            sales_count: Math.floor(Math.random() * 20) + 5, // Seed with some sales
          })
          .returning();

        console.log(`✅ Created template: ${config.title} (ID: ${newTemplate.id})`);

      } catch (error) {
        console.error(`❌ Failed to generate template for ${config.city}:`, error);
      }

      // Add delay between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n🎉 Budget template seeding complete!');
    console.log(`📊 Created ${budgetTemplates.length} budget-friendly templates`);

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await db.$client.end();
  }
}

// Run the seeding
seedBudgetTemplates();