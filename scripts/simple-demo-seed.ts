import { db } from "../server/db";
import { organizations, users, trips } from "../shared/schema";
import { hashPassword } from "../server/auth";

export async function seedDemoData() {
  console.log("🌱 Starting demo data seeding...");
  
  try {
    // Create demo organizations
    const orgs = await db.insert(organizations).values([
      {
        name: "Orbit Travel Co",
        plan: "enterprise",
        domain: "demo1.nestmap.app",
        white_label_enabled: true,
        primary_color: "#3B82F6",
        secondary_color: "#1E40AF",
        accent_color: "#60A5FA",
        logo_url: "/demo-assets/orbit-logo.svg",
        support_email: "support@orbittravel.com"
      },
      {
        name: "Haven Journeys", 
        plan: "enterprise",
        domain: "demo2.nestmap.app",
        white_label_enabled: true,
        primary_color: "#10B981",
        secondary_color: "#059669", 
        accent_color: "#34D399",
        logo_url: "/demo-assets/haven-logo.svg",
        support_email: "support@havenjourneys.com"
      },
      {
        name: "Velocity Trips",
        plan: "enterprise", 
        domain: "demo3.nestmap.app",
        white_label_enabled: true,
        primary_color: "#EF4444",
        secondary_color: "#DC2626",
        accent_color: "#F87171", 
        logo_url: "/demo-assets/velocity-logo.svg",
        support_email: "support@velocitytrips.com"
      }
    ]).returning();

    console.log(`✓ Created ${orgs.length} demo organizations`);

    // Create demo users for each organization
    const hashedPassword = hashPassword("password");
    const users_created = [];

    for (const org of orgs) {
      const orgUsers = await db.insert(users).values([
        {
          auth_id: `demo_admin_${org.id}`,
          username: `admin_${org.name.toLowerCase().replace(/\s+/g, '_')}`,
          email: `admin@${org.domain}`,
          password_hash: hashedPassword,
          display_name: "Admin User",
          role: "admin",
          organization_id: org.id,
          role_type: "corporate"
        },
        {
          auth_id: `demo_manager_${org.id}`,
          username: `manager_${org.name.toLowerCase().replace(/\s+/g, '_')}`,
          email: `manager@${org.domain}`,
          password_hash: hashedPassword,
          display_name: "Travel Manager",
          role: "manager", 
          organization_id: org.id,
          role_type: "corporate"
        },
        {
          auth_id: `demo_user1_${org.id}`,
          username: `agent1_${org.name.toLowerCase().replace(/\s+/g, '_')}`,
          email: `agent1@${org.domain}`,
          password_hash: hashedPassword,
          display_name: "Travel Agent",
          role: "user",
          organization_id: org.id,
          role_type: "corporate"
        }
      ]).returning();

      users_created.push(...orgUsers);
      console.log(`✓ Created ${orgUsers.length} users for ${org.name}`);
    }

    // Create demo trips
    const trips_created = [];
    const tripTemplates = [
      {
        title: "Q1 Sales Conference - Tokyo",
        city: "Tokyo",
        country: "Japan",
        start_date: new Date("2025-03-15"),
        end_date: new Date("2025-03-20"),
        budget: 4500,
        trip_type: "business",
        client_name: "Tech Solutions Inc"
      },
      {
        title: "Client Meeting - London", 
        city: "London",
        country: "United Kingdom",
        start_date: new Date("2025-02-10"),
        end_date: new Date("2025-02-14"),
        budget: 3200,
        trip_type: "business",
        client_name: "Global Consulting Ltd"
      }
    ];

    for (const org of orgs) {
      const orgAdmins = users_created.filter(u => u.organization_id === org.id && u.role === 'admin');
      const adminUser = orgAdmins[0];

      for (const template of tripTemplates) {
        const trip = await db.insert(trips).values({
          title: template.title,
          start_date: template.start_date,
          end_date: template.end_date,
          user_id: adminUser.id,
          organization_id: org.id,
          city: template.city,
          country: template.country,
          budget: template.budget,
          trip_type: template.trip_type,
          client_name: template.client_name,
          completed: false,
          isPublic: false
        }).returning();

        trips_created.push(...trip);
      }
      
      console.log(`✓ Created 2 demo trips for ${org.name}`);
    }

    console.log("✅ Demo data seeding completed successfully!");
    return { 
      success: true, 
      organizations: orgs.length,
      users: users_created.length,
      trips: trips_created.length 
    };

  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    throw error;
  }
}

// Helper function to run seeding
if (require.main === module) {
  seedDemoData()
    .then((result) => {
      console.log("Demo data seeding completed!", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding demo data:", error);
      process.exit(1);
    });
}