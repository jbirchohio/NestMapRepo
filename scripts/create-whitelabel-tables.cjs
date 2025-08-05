const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createWhiteLabelTables() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🎨 Creating white label management tables...');

    // White label configurations
    await sql`
      CREATE TABLE IF NOT EXISTS white_label_configs (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER UNIQUE REFERENCES organizations(id),
        domain TEXT UNIQUE NOT NULL,
        brand_name TEXT NOT NULL,
        logo_url TEXT,
        favicon_url TEXT,
        primary_color TEXT DEFAULT '#3B82F6',
        secondary_color TEXT DEFAULT '#1E40AF',
        accent_color TEXT DEFAULT '#10B981',
        font_family TEXT DEFAULT 'Inter',
        custom_css TEXT,
        email_sender_name TEXT,
        email_sender_address TEXT,
        support_email TEXT,
        support_phone TEXT,
        terms_url TEXT,
        privacy_url TEXT,
        social_links JSONB,
        meta_tags JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Theme presets
    await sql`
      CREATE TABLE IF NOT EXISTS theme_presets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        colors JSONB NOT NULL,
        fonts JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        preview_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Custom pages
    await sql`
      CREATE TABLE IF NOT EXISTS custom_pages (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        meta_description TEXT,
        is_public BOOLEAN DEFAULT true,
        layout TEXT DEFAULT 'default',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, slug)
      )
    `;

    // Email templates
    await sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        template_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_content TEXT,
        text_content TEXT,
        variables JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, template_type)
      )
    `;

    // Domain verification
    await sql`
      CREATE TABLE IF NOT EXISTS domain_verifications (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        domain TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        verification_token TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        ssl_enabled BOOLEAN DEFAULT false,
        ssl_certificate_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(organization_id, domain)
      )
    `;

    console.log('✅ Created white label tables');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_configs(domain)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_white_label_org ON white_label_configs(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_pages_org ON custom_pages(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_domain_verifications_org ON domain_verifications(organization_id)`;

    console.log('✅ Created indexes for white label tables');

    // Insert theme presets
    const presets = [
      {
        name: 'Modern Blue',
        description: 'Clean and professional blue theme',
        colors: {
          primary: '#3B82F6',
          secondary: '#1E40AF',
          accent: '#10B981',
          background: '#F9FAFB',
          text: '#111827'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        },
        is_default: true
      },
      {
        name: 'Elegant Dark',
        description: 'Sophisticated dark theme',
        colors: {
          primary: '#8B5CF6',
          secondary: '#6D28D9',
          accent: '#EC4899',
          background: '#111827',
          text: '#F9FAFB'
        },
        fonts: {
          heading: 'Poppins',
          body: 'Inter'
        }
      },
      {
        name: 'Corporate Green',
        description: 'Professional green theme for enterprises',
        colors: {
          primary: '#059669',
          secondary: '#047857',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937'
        },
        fonts: {
          heading: 'Roboto',
          body: 'Roboto'
        }
      },
      {
        name: 'Warm Orange',
        description: 'Friendly and inviting orange theme',
        colors: {
          primary: '#F97316',
          secondary: '#EA580C',
          accent: '#06B6D4',
          background: '#FFF7ED',
          text: '#1F2937'
        },
        fonts: {
          heading: 'Nunito',
          body: 'Open Sans'
        }
      }
    ];

    for (const preset of presets) {
      await sql`
        INSERT INTO theme_presets (name, description, colors, fonts, is_default)
        VALUES (${preset.name}, ${preset.description}, ${JSON.stringify(preset.colors)}, ${JSON.stringify(preset.fonts)}, ${preset.is_default})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    console.log('✅ Inserted theme presets');

    // Get some organizations for sample data
    const orgs = await sql`SELECT id, name FROM organizations LIMIT 3`;
    
    if (orgs.length > 0) {
      // Sample white label configs
      for (let i = 0; i < Math.min(orgs.length, 2); i++) {
        const org = orgs[i];
        const domain = `${org.name.toLowerCase().replace(/\s+/g, '-')}.voyageops.com`;
        
        await sql`
          INSERT INTO white_label_configs (
            organization_id, domain, brand_name, primary_color, 
            secondary_color, accent_color, email_sender_name
          ) VALUES (
            ${org.id},
            ${domain},
            ${org.name} Travel Portal,
            ${['#3B82F6', '#059669', '#F97316'][i % 3]},
            ${['#1E40AF', '#047857', '#EA580C'][i % 3]},
            ${['#10B981', '#F59E0B', '#06B6D4'][i % 3]},
            ${org.name} Team
          )
          ON CONFLICT (organization_id) DO NOTHING
        `;

        // Email templates for each org
        const emailTypes = ['welcome', 'trip_reminder', 'booking_confirmation', 'password_reset'];
        for (const type of emailTypes) {
          await sql`
            INSERT INTO email_templates (
              organization_id, template_type, subject, html_content
            ) VALUES (
              ${org.id},
              ${type},
              ${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())},
              ${`<h1>{{brand_name}}</h1><p>This is a sample ${type} email template.</p>`}
            )
            ON CONFLICT (organization_id, template_type) DO NOTHING
          `;
        }

        // Custom pages
        const pages = [
          { slug: 'about', title: 'About Us', content: '<h1>About Our Company</h1><p>Learn more about our travel services.</p>' },
          { slug: 'contact', title: 'Contact', content: '<h1>Get in Touch</h1><p>We would love to hear from you.</p>' }
        ];

        for (const page of pages) {
          await sql`
            INSERT INTO custom_pages (
              organization_id, slug, title, content
            ) VALUES (
              ${org.id},
              ${page.slug},
              ${page.title},
              ${page.content}
            )
            ON CONFLICT (organization_id, slug) DO NOTHING
          `;
        }
      }

      console.log('✅ Generated sample white label data');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating white label tables:', error);
    await sql.end();
    process.exit(1);
  }
}

createWhiteLabelTables();