-- Free Performance Optimization: Comprehensive Database Indexes
-- These indexes will dramatically improve query performance at zero cost

-- Full-text search index for templates (massive speedup for search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_fulltext_search 
ON templates USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) WHERE status = 'published';

-- Composite index for template filtering (covers most common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_filter_composite 
ON templates(status, sales_count DESC, created_at DESC) 
WHERE status = 'published';

-- Covering index for template listings (eliminates table lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_listing_covering
ON templates(status, sales_count DESC) 
INCLUDE (title, price, cover_image, user_id, rating, review_count)
WHERE status = 'published';

-- Index for price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_price_range
ON templates(status, price) 
WHERE status = 'published' AND price IS NOT NULL;

-- Optimized index for user's purchased templates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_user_complete
ON template_purchases(buyer_id, status, purchased_at DESC)
INCLUDE (template_id, seller_id, price)
WHERE status = 'completed';

-- Index for seller revenue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_seller_revenue
ON template_purchases(seller_id, status, purchased_at)
INCLUDE (seller_earnings)
WHERE status = 'completed';

-- Optimized activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_trip_optimized
ON activities(trip_id, date, "order")
INCLUDE (title, location_name, latitude, longitude, tag);

-- User trips with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_dates
ON trips(user_id, start_date DESC)
INCLUDE (title, city, country, end_date);

-- Template reviews for rating calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_template_rating
ON template_reviews(template_id)
INCLUDE (rating, created_at)
WHERE rating IS NOT NULL;

-- Geocoding cache optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_geocoding
ON activities(location_name, latitude, longitude)
WHERE location_name IS NOT NULL;

-- Creator profiles for quick lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creator_profiles_featured
ON creator_profiles(featured, total_sales DESC)
WHERE featured = true;

-- Template tags and destinations (already using GIN for arrays)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_tags_gin
ON templates USING GIN(tags) WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_destinations_gin
ON templates USING GIN(destinations) WHERE status = 'published';

-- Partial indexes for common queries (very efficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_free
ON templates(created_at DESC)
WHERE status = 'published' AND (price IS NULL OR price = '0');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_premium
ON templates(sales_count DESC)
WHERE status = 'published' AND price > '0';

-- Index for webhook processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_webhook
ON template_purchases(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Optimize join operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lookup
ON users(id) INCLUDE (username, display_name, email);

-- Index for trip sharing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_share_code
ON trips(share_code)
WHERE sharing_enabled = true;

-- Template slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_slug_unique
ON templates(slug)
WHERE status = 'published';

-- Analyze tables to update query planner statistics
ANALYZE templates;
ANALYZE template_purchases;
ANALYZE trips;
ANALYZE activities;
ANALYZE users;
ANALYZE creator_profiles;
ANALYZE template_reviews;

-- Create a view for commonly joined data (eliminates join overhead)
CREATE OR REPLACE VIEW v_templates_with_creator AS
SELECT 
  t.*,
  u.username as creator_username,
  u.display_name as creator_display_name,
  cp.bio as creator_bio,
  cp.verified as creator_verified,
  cp.total_sales as creator_total_sales
FROM templates t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN creator_profiles cp ON t.user_id = cp.user_id
WHERE t.status = 'published';

-- Create materialized view for expensive aggregations (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_template_stats AS
SELECT 
  t.id as template_id,
  COUNT(DISTINCT tp.id) as purchase_count,
  COUNT(DISTINCT tr.id) as review_count,
  AVG(tr.rating)::numeric(3,2) as avg_rating,
  SUM(tp.seller_earnings::numeric) as total_revenue,
  MAX(tp.purchased_at) as last_purchase_date
FROM templates t
LEFT JOIN template_purchases tp ON t.id = tp.template_id AND tp.status = 'completed'
LEFT JOIN template_reviews tr ON t.id = tr.template_id
GROUP BY t.id;

-- Create index on materialized view
CREATE UNIQUE INDEX ON mv_template_stats(template_id);

-- Add comment explaining refresh strategy
COMMENT ON MATERIALIZED VIEW mv_template_stats IS 
'Refresh every hour with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_stats;';