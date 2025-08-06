import { Router } from 'express';
import { db } from '../db-connection';
import { trips, activities } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Popular destinations for programmatic SEO
const POPULAR_DESTINATIONS = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Miami',
  'Orlando', 'Las Vegas', 'Boston', 'Seattle', 'San Francisco',
  'Denver', 'Nashville', 'Portland', 'Austin', 'Atlanta',
  // International
  'London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam',
  'Tokyo', 'Bangkok', 'Singapore', 'Dubai', 'Sydney',
  'Toronto', 'Vancouver', 'Mexico City', 'Cancun', 'Rio de Janeiro'
];

// Activity types for programmatic pages
const ACTIVITY_TYPES = [
  'tours', 'attractions', 'activities', 'experiences', 'adventures',
  'sightseeing', 'museums', 'shows', 'dining', 'nightlife'
];

// Generate XML sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `https://${req.hostname}`;
    
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
    
    // Destination pages (programmatic SEO)
    POPULAR_DESTINATIONS.forEach(destination => {
      const slug = destination.toLowerCase().replace(/\s+/g, '-');
      
      // Main destination page
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/destinations/${slug}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `  </url>\n`;
      
      // Hotels page
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/hotels/${slug}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
      
      // Packages page
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/packages/${slug}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
      
      // Activity type pages
      ACTIVITY_TYPES.forEach(activityType => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/destinations/${slug}/${activityType}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });
    });
    
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
  const baseUrl = process.env.BASE_URL || `https://${req.hostname}`;
  
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
    const baseUrl = process.env.BASE_URL || `https://${req.hostname}`;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    
    // Extended destination list for long-tail SEO
    const allDestinations = [
      ...POPULAR_DESTINATIONS,
      // Add state capitals
      'Sacramento', 'Albany', 'Richmond', 'Columbus', 'Madison',
      // Add tourist destinations
      'Honolulu', 'Key West', 'Napa Valley', 'Yellowstone', 'Grand Canyon',
      // European cities
      'Vienna', 'Prague', 'Budapest', 'Lisbon', 'Copenhagen',
      // Asian destinations  
      'Seoul', 'Shanghai', 'Hong Kong', 'Bali', 'Phuket'
    ];
    
    allDestinations.forEach(destination => {
      const slug = destination.toLowerCase().replace(/\s+/g, '-');
      
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/destinations/${slug}</loc>\n`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${baseUrl}/images/destinations/${slug}.jpg</image:loc>\n`;
      xml += `      <image:title>${destination} Travel Guide</image:title>\n`;
      xml += `    </image:image>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
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