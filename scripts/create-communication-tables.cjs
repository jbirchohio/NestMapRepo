const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createCommunicationTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('📢 Creating communication hub tables...');

    // Announcements
    await sql`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        target_audience TEXT DEFAULT 'all',
        target_organizations INTEGER[],
        target_roles TEXT[],
        is_pinned BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        publish_at TIMESTAMP DEFAULT NOW(),
        expire_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Announcement read status
    await sql`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        id SERIAL PRIMARY KEY,
        announcement_id INTEGER REFERENCES announcements(id),
        user_id INTEGER REFERENCES users(id),
        read_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(announcement_id, user_id)
      )
    `;

    // Broadcast messages
    await sql`
      CREATE TABLE IF NOT EXISTS broadcast_messages (
        id SERIAL PRIMARY KEY,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        html_content TEXT,
        recipient_type TEXT NOT NULL,
        recipient_filters JSONB,
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        status TEXT DEFAULT 'draft',
        total_recipients INTEGER DEFAULT 0,
        successful_sends INTEGER DEFAULT 0,
        failed_sends INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Broadcast recipients
    await sql`
      CREATE TABLE IF NOT EXISTS broadcast_recipients (
        id SERIAL PRIMARY KEY,
        broadcast_id INTEGER REFERENCES broadcast_messages(id),
        user_id INTEGER REFERENCES users(id),
        email TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        error_message TEXT,
        metadata JSONB
      )
    `;

    // Check if notifications table exists and add missing columns if needed
    const notificationsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `;

    if (!notificationsExists[0].exists) {
      await sql`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          is_read BOOLEAN DEFAULT false,
          is_archived BOOLEAN DEFAULT false,
          action_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
    }

    // Changelog entries
    await sql`
      CREATE TABLE IF NOT EXISTS changelog_entries (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        release_date DATE NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        features JSONB,
        fixes JSONB,
        breaking_changes JSONB,
        is_published BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // User preferences for communications
    await sql`
      CREATE TABLE IF NOT EXISTS communication_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        email_announcements BOOLEAN DEFAULT true,
        email_updates BOOLEAN DEFAULT true,
        email_marketing BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT true,
        notification_frequency TEXT DEFAULT 'immediate',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created communication hub tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, publish_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_audience)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id)`;
    if (notificationsExists[0].exists) {
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`;
    }
    await sql`CREATE INDEX IF NOT EXISTS idx_changelog_published ON changelog_entries(is_published, release_date DESC)`;

    console.log('✅ Created indexes for communication tables');

    // Insert sample announcements
    const announcements = [
      {
        title: 'Welcome to VoyageOps 2.0!',
        content: 'We are excited to announce the launch of VoyageOps 2.0 with enhanced features and improved performance.',
        type: 'product_update',
        severity: 'info',
        is_pinned: true
      },
      {
        title: 'Scheduled Maintenance - December 15',
        content: 'We will be performing scheduled maintenance on December 15 from 2:00 AM to 4:00 AM UTC.',
        type: 'maintenance',
        severity: 'warning'
      },
      {
        title: 'New Feature: AI Trip Planning',
        content: 'Introducing our new AI-powered trip planning assistant to help create perfect itineraries.',
        type: 'feature',
        severity: 'success'
      },
      {
        title: 'Security Update Required',
        content: 'Please update your password to meet our new enhanced security requirements.',
        type: 'security',
        severity: 'error',
        target_audience: 'specific_roles',
        target_roles: ['admin', 'user']
      }
    ];

    for (const announcement of announcements) {
      await sql`
        INSERT INTO announcements (
          title, content, type, severity, 
          is_pinned, target_audience, target_roles
        ) VALUES (
          ${announcement.title},
          ${announcement.content},
          ${announcement.type},
          ${announcement.severity},
          ${announcement.is_pinned || false},
          ${announcement.target_audience || 'all'},
          ${announcement.target_roles || null}
        )
      `;
    }

    console.log('✅ Inserted sample announcements');

    // Insert sample changelog entries
    const changelogs = [
      {
        version: '2.5.0',
        release_date: new Date(),
        type: 'major',
        title: 'AI-Powered Features & Performance Improvements',
        description: 'Major update with AI integration and significant performance enhancements.',
        features: [
          'AI Trip Planning Assistant',
          'Smart Activity Recommendations',
          'Real-time Collaboration Features',
          'Enhanced Mobile Experience'
        ],
        fixes: [
          'Fixed timezone issues in activity scheduling',
          'Resolved sync conflicts in offline mode',
          'Improved search performance'
        ],
        is_published: true
      },
      {
        version: '2.4.9',
        release_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        type: 'patch',
        title: 'Bug Fixes and Stability Improvements',
        description: 'Minor fixes and improvements to enhance stability.',
        fixes: [
          'Fixed export functionality for large trips',
          'Resolved authentication timeout issues',
          'Fixed UI glitches on mobile devices'
        ],
        is_published: true
      }
    ];

    for (const changelog of changelogs) {
      await sql`
        INSERT INTO changelog_entries (
          version, release_date, type, title, description,
          features, fixes, is_published
        ) VALUES (
          ${changelog.version},
          ${changelog.release_date},
          ${changelog.type},
          ${changelog.title},
          ${changelog.description},
          ${JSON.stringify(changelog.features || [])},
          ${JSON.stringify(changelog.fixes || [])},
          ${changelog.is_published}
        )
      `;
    }

    console.log('✅ Inserted sample changelog entries');

    // Insert sample broadcast message
    await sql`
      INSERT INTO broadcast_messages (
        subject, content, recipient_type, status, total_recipients
      ) VALUES (
        'Exciting Updates in VoyageOps!',
        'Check out our latest features designed to make your travel planning even better.',
        'all_users',
        'sent',
        150
      )
    `;

    console.log('✅ Generated sample communication data');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating communication tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createCommunicationTables();