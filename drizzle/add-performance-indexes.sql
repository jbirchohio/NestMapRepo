-- Add performance indexes for frequently queried columns
-- These indexes will significantly improve query performance

-- Index for trips by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- Index for activities by trip_id (joins and filters)
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);

-- Index for templates by slug (URL lookups)
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);

-- Index for templates by user_id (creator dashboard)
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- Index for template purchases by buyer
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_id ON template_purchases(buyer_id);

-- Index for template purchases by seller
CREATE INDEX IF NOT EXISTS idx_template_purchases_seller_id ON template_purchases(seller_id);

-- Index for trip collaborators
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);

-- Index for todos by trip
CREATE INDEX IF NOT EXISTS idx_todos_trip_id ON todos(trip_id);

-- Index for notes by trip
CREATE INDEX IF NOT EXISTS idx_notes_trip_id ON notes(trip_id);

-- Index for bookings by trip and user
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

-- Composite index for trips filtering by date and user
CREATE INDEX IF NOT EXISTS idx_trips_user_date ON trips(user_id, start_date DESC);

-- Index for templates by status and featured for marketplace queries
CREATE INDEX IF NOT EXISTS idx_templates_marketplace ON templates(status, featured, created_at DESC) WHERE status = 'published';