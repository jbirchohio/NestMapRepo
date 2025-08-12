-- Safe CASCADE DELETE foreign key constraints with orphan data cleanup

-- First, clean up any orphaned data
DELETE FROM activities WHERE trip_id NOT IN (SELECT id FROM trips);
DELETE FROM notes WHERE trip_id NOT IN (SELECT id FROM trips);
DELETE FROM notes WHERE created_by NOT IN (SELECT id FROM users);
DELETE FROM todos WHERE trip_id NOT IN (SELECT id FROM trips);
DELETE FROM bookings WHERE trip_id NOT IN (SELECT id FROM trips);
DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM trip_collaborators WHERE trip_id NOT IN (SELECT id FROM trips);
DELETE FROM trip_collaborators WHERE user_id NOT IN (SELECT id FROM users);

-- Now add the CASCADE DELETE constraints
DO $$ 
BEGIN
  -- Activities references trips
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_trip_id_fkey') THEN
    ALTER TABLE activities DROP CONSTRAINT activities_trip_id_fkey;
  END IF;
  ALTER TABLE activities ADD CONSTRAINT activities_trip_id_fkey 
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

  -- Notes references trips
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_trip_id_fkey') THEN
    ALTER TABLE notes DROP CONSTRAINT notes_trip_id_fkey;
  END IF;
  ALTER TABLE notes ADD CONSTRAINT notes_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

  -- Notes references users (created_by)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_created_by_fkey') THEN
    ALTER TABLE notes DROP CONSTRAINT notes_created_by_fkey;
  END IF;
  ALTER TABLE notes ADD CONSTRAINT notes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

  -- Todos references trips
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todos_trip_id_fkey') THEN
    ALTER TABLE todos DROP CONSTRAINT todos_trip_id_fkey;
  END IF;
  ALTER TABLE todos ADD CONSTRAINT todos_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

  -- Bookings references trips
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_trip_id_fkey') THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_trip_id_fkey;
  END IF;
  ALTER TABLE bookings ADD CONSTRAINT bookings_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

  -- Bookings references users
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey') THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_fkey;
  END IF;
  ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

  -- Trip collaborators references trips
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_collaborators_trip_id_fkey') THEN
    ALTER TABLE trip_collaborators DROP CONSTRAINT trip_collaborators_trip_id_fkey;
  END IF;
  ALTER TABLE trip_collaborators ADD CONSTRAINT trip_collaborators_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

  -- Trip collaborators references users
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_collaborators_user_id_fkey') THEN
    ALTER TABLE trip_collaborators DROP CONSTRAINT trip_collaborators_user_id_fkey;
  END IF;
  ALTER TABLE trip_collaborators ADD CONSTRAINT trip_collaborators_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

  -- Trips references users
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_user_id_fkey') THEN
    ALTER TABLE trips DROP CONSTRAINT trips_user_id_fkey;
  END IF;
  ALTER TABLE trips ADD CONSTRAINT trips_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;