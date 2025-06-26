'use strict';

/**
 * Migration to update the bookings table schema to align with shared types
 */

exports.up = async function(db) {
  // Add new enum type for booking_status if it doesn't exist
  await db.runSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
          'pending',
          'confirmed',
          'cancelled',
          'completed',
          'refunded'
        );
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type') THEN
        CREATE TYPE booking_type AS ENUM (
          'flight',
          'hotel',
          'car_rental',
          'activity',
          'other'
        );
      END IF;
    END
    $$;
  `);

  // Add new columns and modify existing ones
  await db.runSql(`
    -- Add reference column if it doesn't exist
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE NOT NULL DEFAULT ('B' || lpad(floor(random() * 1000000)::text, 6, '0'));
    
    -- Rename start_date to booking_date
    ALTER TABLE bookings RENAME COLUMN start_date TO booking_date;
    
    -- Make end_date nullable
    ALTER TABLE bookings ALTER COLUMN end_date DROP NOT NULL;
    
    -- Add check_in_date and check_out_date
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS check_in_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS check_out_date TIMESTAMP WITH TIME ZONE;
    
    -- Rename price to amount
    ALTER TABLE bookings RENAME COLUMN price TO amount;
    
    -- Add notes column
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS notes TEXT;
    
    -- Add cancellation policy fields
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMP WITH TIME ZONE;
    
    -- Add activity_id foreign key
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;
    
    -- Update booking_type enum values if needed
    DO $$
    BEGIN
      -- This is a complex operation that might require dropping and recreating the column
      -- We'll need to handle this carefully in a production environment
      -- For now, we'll just log a notice
      RAISE NOTICE 'If you need to update booking_type enum values, you may need to recreate the column';
    END
    $$;
    
    -- Update status to use the new enum type
    ALTER TABLE bookings 
    ALTER COLUMN status TYPE booking_status 
    USING status::text::booking_status;
    
    -- Update type to use the new enum type
    ALTER TABLE bookings 
    ALTER COLUMN type TYPE booking_type 
    USING (
      CASE type::text
        WHEN 'car' THEN 'car_rental'::text
        WHEN 'transportation' THEN 'other'::text
        ELSE type::text
      END
    )::booking_type;
  `);
};

exports.down = async function(db) {
  // This is a complex migration to reverse, so we'll just log a notice
  await db.runSql(`
    DO $$
    BEGIN
      RAISE NOTICE 'Reversing the bookings schema update requires manual intervention';
    END
    $$;
  `);
};
