-- Migration: Add performance indexes for common queries
-- Purpose: Optimize database query performance for frequently accessed patterns

-- Templates table indexes
CREATE INDEX IF NOT EXISTS idx_templates_status_created ON templates(status, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_price ON templates(price) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_templates_duration ON templates(duration) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_templates_sales_count ON templates(sales_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);

-- Template purchases indexes
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer ON template_purchases(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_template_purchases_seller ON template_purchases(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template ON template_purchases(template_id, status);
CREATE INDEX IF NOT EXISTS idx_template_purchases_intent ON template_purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_date ON template_purchases(purchased_at DESC);

-- Trips table indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code) WHERE sharing_enabled = true;
CREATE INDEX IF NOT EXISTS idx_trips_public ON trips(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);

-- Activities table indexes
CREATE INDEX IF NOT EXISTS idx_activities_trip ON activities(trip_id, date, "order");
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_featured ON creator_profiles(featured, total_sales DESC) WHERE featured = true;

-- Template reviews indexes
CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON template_reviews(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_reviews_user ON template_reviews(user_id, template_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_rating ON template_reviews(template_id, rating) WHERE rating IS NOT NULL;

-- Trip collaborators indexes
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip ON trip_collaborators(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user ON trip_collaborators(user_id, status);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);

-- Notes and todos indexes
CREATE INDEX IF NOT EXISTS idx_notes_trip ON notes(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_trip ON todos(trip_id, is_completed, created_at);

-- Template shares indexes
CREATE INDEX IF NOT EXISTS idx_template_shares_code ON template_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_template_shares_template ON template_shares(template_id);

-- Creator balances indexes
CREATE INDEX IF NOT EXISTS idx_creator_balances_user ON creator_balances(user_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_templates_search ON templates(status, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_template_filter_composite ON templates(status, price, duration) 
  WHERE status = 'published';

-- GIN indexes for array fields (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_templates_tags_gin ON templates USING GIN(tags) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_templates_destinations_gin ON templates USING GIN(destinations) WHERE status = 'published';

-- Full text search index (if needed in future)
CREATE INDEX IF NOT EXISTS idx_templates_fulltext ON templates USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, ''))) WHERE status = 'published';

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_template_purchases_analytics ON template_purchases(template_id, purchased_at, seller_earnings) WHERE status = 'completed';

-- Cleanup and analyze tables for query planner
ANALYZE templates;
ANALYZE template_purchases;
ANALYZE trips;
ANALYZE activities;
ANALYZE users;
ANALYZE creator_profiles;
ANALYZE template_reviews;