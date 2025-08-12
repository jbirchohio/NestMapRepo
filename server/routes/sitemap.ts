import { Router } from 'express';
import { db } from '../db-connection';
import { trips, activities, destinations } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Activity types for programmatic pages
const ACTIVITY_TYPES = [
  'tours', 'attractions', 'activities', 'experiences', 'adventures',
  'sightseeing', 'museums', 'shows', 'dining', 'nightlife'
];

// Generate XML sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITEMAP_BASE_URL || process.env.BASE_URL || 'https://remvana.com';

    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { url: '/', priority: 1.0, changefreq: 'daily' },
      { url: '/about', priority: 0.8, changefreq: 'monthly' },
      { url: '/how-it-works', priority: 0.8, changefreq: 'monthly' },
      { url: '/pricing', priority: 0.9, changefreq: 'weekly' },
      { url: '/blog', priority: 0.7, changefreq: 'daily' },
      { url: '/contact', priority: 0.6, changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `  </url>\n`;
    });

    // Destination pages (dynamically from database)
    try {
      const allDestinations = await db.select({
        slug: destinations.slug,
        updated_at: destinations.updated_at
      }).from(destinations)
      .where(eq(destinations.status, 'published'));

      allDestinations.forEach(destination => {
        // Main destination page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/destinations/${destination.slug}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        if (destination.updated_at) {
          xml += `    <lastmod>${destination.updated_at.toISOString().split('T')[0]}</lastmod>\n`;
        } else {
          xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        }
        xml += `  </url>\n`;

        // Hotels page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/hotels/${destination.slug}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;

        // Packages page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/packages/${destination.slug}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;

        // Activity type pages
        ACTIVITY_TYPES.forEach(activityType => {
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/destinations/${destination.slug}/${activityType}</loc>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        });
      });
    } catch (error) {
      logger.error('Error fetching destinations for sitemap:', error);
    }

    // Comparison pages (vs competitors)
    const competitors = ['tripadvisor', 'expedia', 'booking-com', 'kayak', 'tripit', 'wanderlog'];
    competitors.forEach(competitor => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/compare/remvana-vs-${competitor}</loc>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Public trips (if any)
    try {
      const publicTrips = await db.select({
        id: trips.id,
        updated_at: trips.updated_at
      })
      .from(trips)
      .where(sql`${trips.privacy_level} = 'public'`)
      .limit(1000);

      publicTrips.forEach(trip => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/trips/${trip.id}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`;
        if (trip.updated_at) {
          xml += `    <lastmod>${trip.updated_at.toISOString().split('T')[0]}</lastmod>\n`;
        }
        xml += `  </url>\n`;
      });
    } catch (error) {
      logger.error('Error fetching public trips for sitemap:', error);
    }

    // Close XML
    xml += '</urlset>';

    // Set headers and send
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);

  } catch (error) {
    logger.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.SITEMAP_BASE_URL || process.env.BASE_URL || 'https://remvana.com';

  let robots = '# Remvana Robots.txt\n';
  robots += 'User-agent: *\n';
  robots += 'Allow: /\n';
  robots += 'Disallow: /api/\n';
  robots += 'Disallow: /admin/\n';
  robots += 'Disallow: /auth/\n';
  robots += 'Disallow: /trips/*/edit\n';
  robots += '\n';
  robots += '# Crawl-delay\n';
  robots += 'Crawl-delay: 1\n';
  robots += '\n';
  robots += '# Sitemaps\n';
  robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;
  robots += `Sitemap: ${baseUrl}/sitemap-destinations.xml\n`;
  robots += `Sitemap: ${baseUrl}/sitemap-blog.xml\n`;

  res.header('Content-Type', 'text/plain');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(robots);
});

// Destination-specific sitemap (split for large sites)
router.get('/sitemap-destinations.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITEMAP_BASE_URL || process.env.BASE_URL || 'https://remvana.com';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    // Get all destinations from database
    const allDestinations = await db.select({
      slug: destinations.slug,
      name: destinations.name,
      cover_image: destinations.cover_image,
      updated_at: destinations.updated_at
    }).from(destinations)
    .where(eq(destinations.status, 'published'));

    allDestinations.forEach(destination => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/destinations/${destination.slug}</loc>\n`;
      if (destination.cover_image) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${destination.cover_image}</image:loc>\n`;
        xml += `      <image:title>${destination.name} Travel Guide</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      if (destination.updated_at) {
        xml += `    <lastmod>${destination.updated_at.toISOString().split('T')[0]}</lastmod>\n`;
      }
      xml += `  </url>\n`;
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);

  } catch (error) {
    logger.error('Destination sitemap error:', error);
    res.status(500).send('Error generating destination sitemap');
  }
});

export default router;