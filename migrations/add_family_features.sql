-- Add family-friendly features to activities and trips
-- Migration: Add family features

-- Add kid-friendly and age range fields to activities
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS kid_friendly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS max_age INTEGER,
ADD COLUMN IF NOT EXISTS stroller_accessible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add traveling with kids flag to trips
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS traveling_with_kids BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kids_ages JSONB;

-- Create index for filtering kid-friendly activities
CREATE INDEX IF NOT EXISTS idx_activities_kid_friendly ON activities(kid_friendly) WHERE kid_friendly = true;
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);

-- Update some common activities to be kid-friendly (examples)
UPDATE activities 
SET kid_friendly = true, min_age = 0, max_age = 18
WHERE LOWER(title) LIKE '%zoo%' 
   OR LOWER(title) LIKE '%aquarium%'
   OR LOWER(title) LIKE '%park%'
   OR LOWER(title) LIKE '%beach%'
   OR LOWER(title) LIKE '%museum%'
   OR LOWER(title) LIKE '%playground%';

-- Add categories to existing activities
UPDATE activities
SET category = CASE
    WHEN LOWER(title) LIKE '%restaurant%' OR LOWER(title) LIKE '%dinner%' OR LOWER(title) LIKE '%lunch%' OR LOWER(title) LIKE '%breakfast%' THEN 'dining'
    WHEN LOWER(title) LIKE '%museum%' OR LOWER(title) LIKE '%gallery%' OR LOWER(title) LIKE '%exhibit%' THEN 'culture'
    WHEN LOWER(title) LIKE '%park%' OR LOWER(title) LIKE '%hike%' OR LOWER(title) LIKE '%trail%' OR LOWER(title) LIKE '%beach%' THEN 'outdoor'
    WHEN LOWER(title) LIKE '%shopping%' OR LOWER(title) LIKE '%market%' OR LOWER(title) LIKE '%mall%' THEN 'shopping'
    WHEN LOWER(title) LIKE '%show%' OR LOWER(title) LIKE '%concert%' OR LOWER(title) LIKE '%theater%' THEN 'entertainment'
    WHEN LOWER(title) LIKE '%hotel%' OR LOWER(title) LIKE '%airbnb%' OR LOWER(title) LIKE '%hostel%' THEN 'accommodation'
    WHEN LOWER(title) LIKE '%flight%' OR LOWER(title) LIKE '%train%' OR LOWER(title) LIKE '%bus%' OR LOWER(title) LIKE '%taxi%' THEN 'transportation'
    ELSE 'activity'
END
WHERE category IS NULL;