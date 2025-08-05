const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createSupportTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Creating customer support tables...');

    // User impersonation sessions
    await sql`
      CREATE TABLE IF NOT EXISTS impersonation_sessions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        target_user_id INTEGER NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        ip_address TEXT,
        session_token TEXT UNIQUE,
        is_active BOOLEAN DEFAULT true
      )
    `;

    // Support tickets
    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number TEXT UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        subject TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        category TEXT,
        assigned_to INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        satisfaction_rating INTEGER,
        tags TEXT[]
      )
    `;

    // Support messages
    await sql`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        is_internal_note BOOLEAN DEFAULT false,
        attachments JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Canned responses
    await sql`
      CREATE TABLE IF NOT EXISTS canned_responses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        shortcuts TEXT[],
        usage_count INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Customer notes
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        note TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Support metrics
    await sql`
      CREATE TABLE IF NOT EXISTS support_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        tickets_created INTEGER DEFAULT 0,
        tickets_resolved INTEGER DEFAULT 0,
        avg_resolution_time_hours DECIMAL(10, 2),
        avg_first_response_time_minutes DECIMAL(10, 2),
        satisfaction_score DECIMAL(3, 2),
        messages_sent INTEGER DEFAULT 0,
        active_tickets INTEGER DEFAULT 0
      )
    `;

    console.log('✅ Created support tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON impersonation_sessions(admin_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_impersonation_target ON impersonation_sessions(target_user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_org ON support_tickets(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_ticket ON support_messages(ticket_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notes_user ON customer_notes(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notes_org ON customer_notes(organization_id)`;

    console.log('✅ Created indexes for support tables');

    // Insert sample canned responses
    const cannedResponses = [
      {
        title: 'Welcome to VoyageOps',
        content: 'Thank you for reaching out! I\'m here to help you with your VoyageOps experience. How can I assist you today?',
        category: 'greeting',
        shortcuts: ['welcome', 'hello']
      },
      {
        title: 'Password Reset Instructions',
        content: 'To reset your password, please click on "Forgot Password" on the login page. You\'ll receive an email with instructions to create a new password.',
        category: 'account',
        shortcuts: ['password', 'reset']
      },
      {
        title: 'Billing Question',
        content: 'I\'ll be happy to help with your billing question. Could you please provide more details about the specific issue you\'re experiencing?',
        category: 'billing',
        shortcuts: ['billing', 'payment']
      },
      {
        title: 'Feature Request Acknowledgment',
        content: 'Thank you for your feature suggestion! We value customer feedback and I\'ve forwarded this to our product team for consideration.',
        category: 'feature',
        shortcuts: ['feature', 'request']
      },
      {
        title: 'Ticket Resolved',
        content: 'I\'m glad we could resolve this issue for you! If you have any other questions, please don\'t hesitate to reach out.',
        category: 'closing',
        shortcuts: ['resolved', 'fixed']
      }
    ];

    for (const response of cannedResponses) {
      await sql`
        INSERT INTO canned_responses (title, content, category, shortcuts)
        VALUES (${response.title}, ${response.content}, ${response.category}, ${response.shortcuts})
      `;
    }

    console.log('✅ Inserted sample canned responses');

    // Generate sample support data
    const ticketStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const categories = ['technical', 'billing', 'account', 'feature_request', 'bug_report'];

    // Get some users to create tickets
    const users = await sql`SELECT id FROM users LIMIT 10`;
    const orgs = await sql`SELECT id FROM organizations LIMIT 5`;

    if (users.length > 0) {
      // Create sample tickets
      for (let i = 0; i < 20; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const org = orgs[Math.floor(Math.random() * orgs.length)] || { id: null };
        const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        const ticket = await sql`
          INSERT INTO support_tickets (
            ticket_number,
            user_id,
            organization_id,
            subject,
            description,
            status,
            priority,
            category,
            created_at
          ) VALUES (
            ${'TICKET-' + (1000 + i)},
            ${user.id},
            ${org.id},
            ${'Sample ticket ' + i},
            ${'This is a sample support ticket for testing purposes.'},
            ${status},
            ${priorities[Math.floor(Math.random() * priorities.length)]},
            ${categories[Math.floor(Math.random() * categories.length)]},
            ${createdAt}
          ) RETURNING id
        `;

        // Add some messages to each ticket
        for (let j = 0; j < Math.floor(Math.random() * 5) + 1; j++) {
          await sql`
            INSERT INTO support_messages (
              ticket_id,
              sender_id,
              message,
              is_internal_note
            ) VALUES (
              ${ticket[0].id},
              ${user.id},
              ${'Sample message ' + j},
              ${Math.random() > 0.8}
            )
          `;
        }
      }

      console.log('✅ Generated sample support tickets and messages');
    }

    // Generate support metrics for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      await sql`
        INSERT INTO support_metrics (
          date,
          tickets_created,
          tickets_resolved,
          avg_resolution_time_hours,
          avg_first_response_time_minutes,
          satisfaction_score,
          messages_sent,
          active_tickets
        ) VALUES (
          ${date.toISOString().split('T')[0]},
          ${Math.floor(Math.random() * 20) + 5},
          ${Math.floor(Math.random() * 15) + 3},
          ${(Math.random() * 48 + 12).toFixed(2)},
          ${(Math.random() * 60 + 10).toFixed(2)},
          ${(Math.random() * 2 + 3).toFixed(2)},
          ${Math.floor(Math.random() * 50) + 20},
          ${Math.floor(Math.random() * 30) + 10}
        )
        ON CONFLICT (date) DO NOTHING
      `;
    }

    console.log('✅ Generated sample support metrics');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating support tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createSupportTables();