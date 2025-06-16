-- Create missing enum types for Drizzle push

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'manager',
    'member',
    'guest'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE organization_plan AS ENUM (
    'free',
    'pro',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
