import { db } from "../server/db";
import { organizations, users, trips, activities, expenses } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

interface DemoOrganization {
  name: string;
  slug: string;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  domain: string;
  supportEmail: string;
}

const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    name: "Orbit Travel Co",
    slug: "demo-corp-1",
    appName: "Orbit Travel Hub",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF", 
    accentColor: "#60A5FA",
    logoUrl: "/demo-assets/orbit-logo.svg",
    domain: "demo1.nestmap.app",
    supportEmail: "support@orbittravel.com"
  },
  {
    name: "Haven Journeys",
    slug: "demo-corp-2", 
    appName: "Haven Travel Portal",
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentColor: "#34D399",
    logoUrl: "/demo-assets/haven-logo.svg",
    domain: "demo2.nestmap.app",
    supportEmail: "support@havenjourneys.com"
  },
  {
    name: "Velocity Trips",
    slug: "demo-corp-3",
    appName: "Velocity Travel Suite", 
    primaryColor: "#EF4444",
    secondaryColor: "#DC2626",
    accentColor: "#F87171",
    logoUrl: "/demo-assets/velocity-logo.svg",
    domain: "demo3.nestmap.app",
    supportEmail: "support@velocitytrips.com"
  }
];

interface DemoUser {
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

const DEMO_USERS_PER_ORG: DemoUser[] = [
  {
    username: "admin",
    email: "admin@{domain}",
    displayName: "Admin User",
    role: "admin",
    department: "Management"
  },
  {
    username: "manager1", 
    email: "manager@{domain}",
    displayName: "Travel Manager",
    role: "manager",
    department: "Operations"
  },
  {
    username: "agent1",
    email: "agent1@{domain}",
    displayName: "Travel Agent",
    role: "user", 
    department: "Sales"
  },
  {
    username: "agent2",
    email: "agent2@{domain}",
    displayName: "Senior Agent",
    role: "user",
    department: "Sales"
  }
];

interface DemoTrip {
  title: string;
  destination: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'draft' | 'planning' | 'booked' | 'completed';
  tripType: 'business' | 'leisure';
  clientName?: string;
}

const DEMO_TRIPS: DemoTrip[] = [
  {
    title: "Q1 Sales Conference - Tokyo",
    destination: "Tokyo, Japan",
    city: "Tokyo", 
    country: "Japan",
    startDate: "2025-03-15",
    endDate: "2025-03-20",
    budget: 4500,
    status: "booked",
    tripType: "business",
    clientName: "Tech Solutions Inc"
  },
  {
    title: "Client Meeting - London",
    destination: "London, United Kingdom", 
    city: "London",
    country: "United Kingdom",
    startDate: "2025-02-10",
    endDate: "2025-02-14", 
    budget: 3200,
    status: "planning",
    tripType: "business",
    clientName: "Global Consulting Ltd"
  },
  {
    title: "Team Retreat - Barcelona",
    destination: "Barcelona, Spain",
    city: "Barcelona",
    country: "Spain", 
    startDate: "2025-04-05",
    endDate: "2025-04-08",
    budget: 2800,
    status: "draft",
    tripType: "business"
  },
  {
    title: "Product Launch - New York",
    destination: "New York, USA",
    city: "New York",
    country: "USA",
    startDate: "2025-01-25",
    endDate: "2025-01-28",
    budget: 3800,
    status: "completed",
    tripType: "business",
    clientName: "Innovation Corp"
  }
];

interface DemoActivity {
  title: string;
  description: string;
  category: string;
  startTime: string;
  endTime: string;
  location: string;
  cost: number;
  day: number; // Which day of the trip (1, 2, 3, etc.)
}

const DEMO_ACTIVITIES: DemoActivity[] = [
  {
    title: "Airport Transfer",
    description: "Private transfer from airport to hotel",
    category: "Transportation", 
    startTime: "14:00",
    endTime: "15:30",
    location: "Haneda Airport",
    cost: 85,
    day: 1
  },
  {
    title: "Welcome Dinner",
    description: "Team dinner at traditional Japanese restaurant",
    category: "Dining",
    startTime: "19:00", 
    endTime: "21:30",
    location: "Sukiyabashi Jiro",
    cost: 150,
    day: 1
  },
  {
    title: "Conference Registration",
    description: "Check-in and morning keynote session",
    category: "Business",
    startTime: "09:00",
    endTime: "12:00", 
    location: "Tokyo International Forum",
    cost: 0,
    day: 2
  },
  {
    title: "Networking Lunch",
    description: "Business lunch with industry partners",
    category: "Business",
    startTime: "12:30",
    endTime: "14:00",
    location: "Conference Center",
    cost: 65,
    day: 2
  },
  {
    title: "City Tour",
    description: "Guided tour of Tokyo highlights",
    category: "Cultural",
    startTime: "10:00",
    endTime: "16:00",
    location: "Tokyo City Center", 
    cost: 120,
    day: 3
  }
];

export async function seedDemoData() {
  console.log("🌱 Starting demo data seeding...");
  
  try {
    // Clear existing demo data
    await clearDemoData();
    
    // Seed organizations
    console.log("📦 Creating demo organizations...");
    const createdOrgs = await seedOrganizations();
    
    // Seed users for each organization
    console.log("👥 Creating demo users...");
    const createdUsers = await seedUsers(createdOrgs);
    
    // Seed trips and activities
    console.log("🧳 Creating demo trips and activities...");
    await seedTripsAndActivities(createdOrgs, createdUsers);
    
    // Seed expenses
    console.log("💰 Creating demo expenses...");
    await seedExpenses(createdOrgs, createdUsers);
    
    console.log("✅ Demo data seeding completed successfully!");
    return { success: true, organizations: createdOrgs.length };
    
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    throw error;
  }
}

async function clearDemoData() {
  console.log("🧹 Clearing existing demo data...");
  
  // Delete in correct order due to foreign key constraints
  await db.delete(expenses).where(eq(expenses.organizationId, 1));
  await db.delete(activities).where(eq(activities.organizationId, 1));
  await db.delete(trips).where(eq(trips.user_id, 1));
  await db.delete(users).where(eq(users.organization_id, 1));
  
  // Clear all demo organizations (IDs 1, 2, 3)
  for (let i = 1; i <= 3; i++) {
    await db.delete(organizations).where(eq(organizations.id, i));
  }
}

async function seedOrganizations() {
  const createdOrgs = [];
  
  for (const orgData of DEMO_ORGANIZATIONS) {
    const [org] = await db.insert(organizations).values({
      name: orgData.name,
      plan: "enterprise",
      domain: orgData.domain,
      white_label_enabled: true,
      primary_color: orgData.primaryColor,
      secondary_color: orgData.secondaryColor,
      accent_color: orgData.accentColor,
      logo_url: orgData.logoUrl,
      support_email: orgData.supportEmail
    }).returning();
    
    createdOrgs.push(org);
    console.log(`  ✓ Created organization: ${org.name}`);
  }
  
  return createdOrgs;
}

async function seedUsers(organizations: any[]) {
  const createdUsers: any[] = [];
  const hashedPassword = hashPassword("password");
  
  for (const org of organizations) {
    const orgDomain = org.domain.split('.')[0]; // Extract subdomain
    
    for (const userData of DEMO_USERS_PER_ORG) {
      const email = userData.email.replace('{domain}', org.domain);
      
      const [user] = await db.insert(users).values({
        auth_id: `demo_${userData.username}_${orgDomain}`,
        username: `${userData.username}_${orgDomain}`,
        email: email,
        password_hash: hashedPassword,
        display_name: userData.displayName,
        role: userData.role,
        organization_id: org.id,
        role_type: 'corporate',
        created_at: new Date()
      }).returning();
      
      createdUsers.push({ ...user, organizationName: org.name });
      console.log(`  ✓ Created user: ${user.email} for ${org.name}`);
    }
  }
  
  return createdUsers;
}

async function seedTripsAndActivities(organizations: any[], users: any[]) {
  for (const org of organizations) {
    const orgUsers = users.filter(u => u.organizationId === org.id);
    const adminUser = orgUsers.find(u => u.role === 'admin');
    const regularUsers = orgUsers.filter(u => u.role === 'user');
    
    // Create trips for this organization
    for (let i = 0; i < 2; i++) {
      const tripData = DEMO_TRIPS[i % DEMO_TRIPS.length];
      const assignedUser = i === 0 ? adminUser : (regularUsers[i % regularUsers.length] || adminUser);
      
      const [trip] = await db.insert(trips).values({
        title: tripData.title,
        destination: tripData.destination,
        city: tripData.city,
        country: tripData.country,
        startDate: new Date(tripData.startDate),
        endDate: new Date(tripData.endDate),
        userId: assignedUser.id,
        organizationId: org.id,
        budget: tripData.budget,
        status: tripData.status,
        tripType: tripData.tripType,
        clientName: tripData.clientName,
        isPublic: false,
        completed: tripData.status === 'completed',
        completedAt: tripData.status === 'completed' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log(`  ✓ Created trip: ${trip.title} for ${org.name}`);
      
      // Add activities for this trip
      for (let j = 0; j < 3; j++) {
        const activityData = DEMO_ACTIVITIES[j % DEMO_ACTIVITIES.length];
        
        await db.insert(activities).values({
          tripId: trip.id,
          userId: assignedUser.id,
          organizationId: org.id,
          title: activityData.title,
          description: activityData.description,
          category: activityData.category,
          startTime: activityData.startTime,
          endTime: activityData.endTime,
          location: activityData.location,
          cost: activityData.cost,
          day: activityData.day,
          completed: tripData.status === 'completed',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }
}

async function seedExpenses(organizations: any[], users: any[]) {
  for (const org of organizations) {
    const orgUsers = users.filter(u => u.organizationId === org.id);
    const orgTrips = await db.select().from(trips).where(eq(trips.organizationId, org.id));
    
    for (const trip of orgTrips) {
      const assignedUser = orgUsers.find(u => u.id === trip.userId);
      
      // Create a few expenses for each trip
      const expenseCategories = ['Transportation', 'Accommodation', 'Meals', 'Business'];
      const expenseAmounts = [250, 180, 85, 120];
      
      for (let i = 0; i < 3; i++) {
        await db.insert(expenses).values({
          tripId: trip.id,
          userId: assignedUser.id,
          organizationId: org.id,
          category: expenseCategories[i],
          description: `${expenseCategories[i]} expense for ${trip.title}`,
          amount: expenseAmounts[i],
          currency: 'USD',
          date: new Date(trip.startDate),
          status: i === 0 ? 'approved' : 'pending',
          isReimbursable: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }
}

// Helper function to run seeding
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log("Demo data seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding demo data:", error);
      process.exit(1);
    });
}