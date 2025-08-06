import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { users, templates, creatorProfiles, templateReviews } from '../shared/schema';

// Use Railway URL directly
const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

const pool = new Pool({ connectionString: RAILWAY_URL });
const db = drizzle(pool);

// Simple template data without activities
const creators = [
  {
    username: 'luxe_wanderer',
    email: 'sarah@luxewanderer.com',
    displayName: 'Sarah Chen',
    bio: 'Luxury travel connoisseur exploring the world\'s finest hotels and experiences',
    specialties: ['Luxury Travel', 'Hotels', 'Fine Dining'],
    templates: [
      {
        title: 'NYC Luxury Long Weekend',
        description: 'Experience Manhattan like a VIP with exclusive access to the city\'s best',
        price: 49.99,
        destinations: ['New York', 'Manhattan'],
        duration: 4,
        tags: ['luxury', 'city', 'weekend']
      },
      {
        title: 'San Francisco Wine Country Escape',
        description: 'Napa Valley luxury with private tastings and Michelin dining',
        price: 59.99,
        destinations: ['San Francisco', 'Napa Valley'],
        duration: 5,
        tags: ['luxury', 'wine', 'foodie']
      }
    ]
  },
  {
    username: 'budget_backpacker',
    email: 'jake@budgetbackpack.com',
    displayName: 'Jake Martinez',
    bio: 'Proving you can see the world on $50 a day or less',
    specialties: ['Budget Travel', 'Hostels', 'Street Food'],
    templates: [
      {
        title: 'Portland on a Shoestring',
        description: 'Food carts, free activities, and cheap thrills in PDX',
        price: 9.99,
        destinations: ['Portland'],
        duration: 3,
        tags: ['budget', 'foodie', 'hipster']
      },
      {
        title: 'Austin Free Music & Tacos',
        description: 'Experience Austin\'s legendary scene without breaking the bank',
        price: 9.99,
        destinations: ['Austin'],
        duration: 4,
        tags: ['budget', 'music', 'foodie']
      }
    ]
  },
  {
    username: 'family_adventures',
    email: 'emily@familyadventures.com',
    displayName: 'Emily & Tom Johnson',
    bio: 'Family of 4 sharing kid-friendly adventures that parents will love too',
    specialties: ['Family Travel', 'Theme Parks', 'Educational'],
    templates: [
      {
        title: 'Orlando Beyond the Theme Parks',
        description: 'Hidden gems and local favorites for families',
        price: 24.99,
        destinations: ['Orlando'],
        duration: 7,
        tags: ['family', 'kids', 'theme-parks']
      },
      {
        title: 'San Diego Family Beach Week',
        description: 'Beaches, zoo, and family fun in America\'s Finest City',
        price: 29.99,
        destinations: ['San Diego'],
        duration: 7,
        tags: ['family', 'beach', 'outdoors']
      }
    ]
  },
  {
    username: 'foodie_traveler',
    email: 'maria@foodietraveler.com',
    displayName: 'Maria Gonzalez',
    bio: 'James Beard winner taking you on culinary journeys around the world',
    specialties: ['Food Tours', 'Local Cuisine', 'Cooking Classes'],
    templates: [
      {
        title: 'NYC Ultimate Food Tour',
        description: 'From street carts to Michelin stars - eat your way through NYC',
        price: 34.99,
        destinations: ['New York'],
        duration: 5,
        tags: ['foodie', 'restaurants', 'street-food']
      },
      {
        title: 'New Orleans Creole & Cocktails',
        description: 'Dive deep into NOLA\'s incredible culinary scene',
        price: 39.99,
        destinations: ['New Orleans'],
        duration: 4,
        tags: ['foodie', 'cocktails', 'culture']
      }
    ]
  },
  {
    username: 'adventure_seeker',
    email: 'alex@adventureseeker.com',
    displayName: 'Alex Thompson',
    bio: 'Extreme sports enthusiast and outdoor adventure guide',
    specialties: ['Adventure Sports', 'Hiking', 'Rock Climbing'],
    templates: [
      {
        title: 'Utah Mighty Five Adventure',
        description: 'Epic road trip through all five national parks',
        price: 44.99,
        destinations: ['Utah', 'Zion', 'Bryce', 'Arches'],
        duration: 10,
        tags: ['adventure', 'national-parks', 'hiking']
      },
      {
        title: 'Colorado 14ers Challenge',
        description: 'Conquer Colorado\'s highest peaks',
        price: 39.99,
        destinations: ['Colorado', 'Denver', 'Aspen'],
        duration: 7,
        tags: ['adventure', 'hiking', 'mountains']
      }
    ]
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding templates to Railway database...');
  
  try {
    // Clear existing seed data
    console.log('Clearing existing seed data...');
    const seedUsers = await db.select().from(users).where(eq(users.email, 'sarah@luxewanderer.com'));
    for (const user of seedUsers) {
      await db.delete(templates).where(eq(templates.user_id, user.id));
      await db.delete(creatorProfiles).where(eq(creatorProfiles.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
    
    // Create creators and templates
    for (const creatorData of creators) {
      console.log(`Creating creator: ${creatorData.username}`);
      
      // Create user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [newUser] = await db.insert(users).values({
        auth_id: `seed_${creatorData.username}_${Date.now()}`,
        username: creatorData.username,
        email: creatorData.email,
        password_hash: hashedPassword,
        display_name: creatorData.displayName,
        role: 'user',
        role_type: 'consumer',
        created_at: new Date()
      }).returning();
      
      // Create creator profile
      await db.insert(creatorProfiles).values({
        user_id: newUser.id,
        bio: creatorData.bio,
        specialties: creatorData.specialties,
        verified: true,
        featured: Math.random() > 0.5,
        follower_count: Math.floor(Math.random() * 50000) + 1000,
        created_at: new Date()
      });
      
      // Create templates
      for (const templateData of creatorData.templates) {
        console.log(`  Creating template: ${templateData.title}`);
        
        const slug = templateData.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        const [newTemplate] = await db.insert(templates).values({
          user_id: newUser.id,
          title: templateData.title,
          slug: `${slug}-${Date.now()}`,
          description: templateData.description,
          price: templateData.price.toString(),
          destinations: templateData.destinations,
          duration: templateData.duration,
          tags: templateData.tags,
          status: 'published',
          featured: Math.random() > 0.7,
          view_count: Math.floor(Math.random() * 1000),
          sales_count: Math.floor(Math.random() * 100),
          rating: (Math.random() * 2 + 3).toFixed(2), // 3.0 to 5.0
          review_count: Math.floor(Math.random() * 50),
          created_at: new Date()
        }).returning();
        
        // Add a few sample reviews
        const reviewCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < reviewCount; i++) {
          try {
            await db.insert(templateReviews).values({
              template_id: newTemplate.id,
              user_id: newUser.id, // Using creator's own ID for demo
              rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
              review: 'Great itinerary! Very helpful and well-organized.',
              verified_purchase: true,
              created_at: new Date()
            });
          } catch (err) {
            // Ignore duplicate review errors
          }
        }
      }
    }
    
    console.log('✅ Templates seeded successfully!');
    
    // Verify seeded data
    const templateCount = await db.select().from(templates);
    console.log(`\n📊 Total templates in Railway: ${templateCount.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await pool.end();
  }
}

seedTemplates();