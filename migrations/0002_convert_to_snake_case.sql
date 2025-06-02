-- Migration to convert all database columns to consistent snake_case naming
-- This eliminates camelCase/snake_case field mapping mismatches

-- Convert activities table
ALTER TABLE activities RENAME COLUMN "tripId" TO trip_id;
ALTER TABLE activities RENAME COLUMN "organizationId" TO organization_id;
ALTER TABLE activities RENAME COLUMN "locationName" TO location_name;
ALTER TABLE activities RENAME COLUMN "assignedTo" TO assigned_to;
ALTER TABLE activities RENAME COLUMN "travelMode" TO travel_mode;

-- Convert todos table
ALTER TABLE todos RENAME COLUMN "tripId" TO trip_id;
ALTER TABLE todos RENAME COLUMN "organizationId" TO organization_id;
ALTER TABLE todos RENAME COLUMN "assignedTo" TO assigned_to;

-- Convert notes table
ALTER TABLE notes RENAME COLUMN "tripId" TO trip_id;
ALTER TABLE notes RENAME COLUMN "organizationId" TO organization_id;

-- Convert trips table camelCase fields
ALTER TABLE trips RENAME COLUMN "isPublic" TO is_public;
ALTER TABLE trips RENAME COLUMN "shareCode" TO share_code;
ALTER TABLE trips RENAME COLUMN "sharingEnabled" TO sharing_enabled;
ALTER TABLE trips RENAME COLUMN "sharePermission" TO share_permission;
ALTER TABLE trips RENAME COLUMN "cityLatitude" TO city_latitude;
ALTER TABLE trips RENAME COLUMN "cityLongitude" TO city_longitude;
ALTER TABLE trips RENAME COLUMN "hotelLatitude" TO hotel_latitude;
ALTER TABLE trips RENAME COLUMN "hotelLongitude" TO hotel_longitude;
ALTER TABLE trips RENAME COLUMN "completedAt" TO completed_at;
ALTER TABLE trips RENAME COLUMN "tripType" TO trip_type;
ALTER TABLE trips RENAME COLUMN "clientName" TO client_name;
ALTER TABLE trips RENAME COLUMN "projectType" TO project_type;

-- Convert other tables with mixed naming
ALTER TABLE trip_collaborators RENAME COLUMN "tripId" TO trip_id;
ALTER TABLE trip_collaborators RENAME COLUMN "userId" TO user_id;
ALTER TABLE trip_collaborators RENAME COLUMN "organizationId" TO organization_id;

-- Convert expenses table if it has camelCase fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'tripId') THEN
        ALTER TABLE expenses RENAME COLUMN "tripId" TO trip_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'organizationId') THEN
        ALTER TABLE expenses RENAME COLUMN "organizationId" TO organization_id;
    END IF;
END $$;

-- Convert calendar_integrations table if it has camelCase fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'userId') THEN
        ALTER TABLE calendar_integrations RENAME COLUMN "userId" TO user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'organizationId') THEN
        ALTER TABLE calendar_integrations RENAME COLUMN "organizationId" TO organization_id;
    END IF;
END $$;

-- Convert bookings table if it has camelCase fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tripId') THEN
        ALTER TABLE bookings RENAME COLUMN "tripId" TO trip_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'userId') THEN
        ALTER TABLE bookings RENAME COLUMN "userId" TO user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'organizationId') THEN
        ALTER TABLE bookings RENAME COLUMN "organizationId" TO organization_id;
    END IF;
END $$;