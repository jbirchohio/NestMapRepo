-- Add CASCADE DELETE foreign key constraints to ensure data integrity

-- Activities references trips
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_trip_id_fkey,
ADD CONSTRAINT activities_trip_id_fkey 
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Notes references trips
ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_trip_id_fkey,
ADD CONSTRAINT notes_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Notes references users (created_by)
ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_created_by_fkey,
ADD CONSTRAINT notes_created_by_fkey
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Todos references trips
ALTER TABLE todos
DROP CONSTRAINT IF EXISTS todos_trip_id_fkey,
ADD CONSTRAINT todos_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Todos references users (assigned_to)
ALTER TABLE todos
DROP CONSTRAINT IF EXISTS todos_assigned_to_fkey,
ADD CONSTRAINT todos_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Bookings references trips
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_trip_id_fkey,
ADD CONSTRAINT bookings_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Bookings references activities
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_activity_id_fkey,
ADD CONSTRAINT bookings_activity_id_fkey
FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- Bookings references users
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey,
ADD CONSTRAINT bookings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Trip collaborators references trips
ALTER TABLE trip_collaborators
DROP CONSTRAINT IF EXISTS trip_collaborators_trip_id_fkey,
ADD CONSTRAINT trip_collaborators_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- Trip collaborators references users
ALTER TABLE trip_collaborators
DROP CONSTRAINT IF EXISTS trip_collaborators_user_id_fkey,
ADD CONSTRAINT trip_collaborators_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Trips references users
ALTER TABLE trips
DROP CONSTRAINT IF EXISTS trips_user_id_fkey,
ADD CONSTRAINT trips_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Templates references users
ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_user_id_fkey,
ADD CONSTRAINT templates_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Template purchases references templates
ALTER TABLE template_purchases
DROP CONSTRAINT IF EXISTS template_purchases_template_id_fkey,
ADD CONSTRAINT template_purchases_template_id_fkey
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Template purchases references buyers
ALTER TABLE template_purchases
DROP CONSTRAINT IF EXISTS template_purchases_buyer_id_fkey,
ADD CONSTRAINT template_purchases_buyer_id_fkey
FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Template purchases references sellers
ALTER TABLE template_purchases
DROP CONSTRAINT IF EXISTS template_purchases_seller_id_fkey,
ADD CONSTRAINT template_purchases_seller_id_fkey
FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

-- Template reviews references templates
ALTER TABLE template_reviews
DROP CONSTRAINT IF EXISTS template_reviews_template_id_fkey,
ADD CONSTRAINT template_reviews_template_id_fkey
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Template reviews references users
ALTER TABLE template_reviews
DROP CONSTRAINT IF EXISTS template_reviews_user_id_fkey,
ADD CONSTRAINT template_reviews_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Template shares references templates
ALTER TABLE template_shares
DROP CONSTRAINT IF EXISTS template_shares_template_id_fkey,
ADD CONSTRAINT template_shares_template_id_fkey
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Template shares references users
ALTER TABLE template_shares
DROP CONSTRAINT IF EXISTS template_shares_shared_by_fkey,
ADD CONSTRAINT template_shares_shared_by_fkey
FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE;

-- Creator profiles references users
ALTER TABLE creator_profiles
DROP CONSTRAINT IF EXISTS creator_profiles_user_id_fkey,
ADD CONSTRAINT creator_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Creator balances references users
ALTER TABLE creator_balances
DROP CONSTRAINT IF EXISTS creator_balances_user_id_fkey,
ADD CONSTRAINT creator_balances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Viator commissions references activities
ALTER TABLE viator_commissions
DROP CONSTRAINT IF EXISTS viator_commissions_activity_id_fkey,
ADD CONSTRAINT viator_commissions_activity_id_fkey
FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- Viator commissions references users
ALTER TABLE viator_commissions
DROP CONSTRAINT IF EXISTS viator_commissions_user_id_fkey,
ADD CONSTRAINT viator_commissions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Template collections references users
ALTER TABLE template_collections
DROP CONSTRAINT IF EXISTS template_collections_user_id_fkey,
ADD CONSTRAINT template_collections_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Invitations references users (invited_by)
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey,
ADD CONSTRAINT invitations_invited_by_fkey
FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE;