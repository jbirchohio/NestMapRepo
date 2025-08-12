-- Migration to add budget tracking features

-- Add budget fields to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS budget_categories JSONB,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_alert_threshold INTEGER DEFAULT 80;

-- Add cost tracking fields to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cost_category TEXT,
ADD COLUMN IF NOT EXISTS split_between INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_by INTEGER;

-- Create group expenses table for split tracking
CREATE TABLE IF NOT EXISTS group_expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  paid_by INTEGER NOT NULL REFERENCES users(id),
  split_type TEXT DEFAULT 'equal', -- equal, custom, percentage
  split_details JSONB NOT NULL,
  category TEXT, -- food, transportation, accommodation, activities, shopping
  receipt_url TEXT,
  notes TEXT,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_expenses_trip_id ON group_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_paid_by ON group_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_activities_cost_category ON activities(cost_category) WHERE cost_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_is_paid ON activities(is_paid);

-- Add trigger to update total_spent when activities are modified
CREATE OR REPLACE FUNCTION update_trip_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the trip's total_spent when an activity's actual_cost changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE trips 
    SET total_spent = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN actual_cost IS NOT NULL THEN actual_cost / COALESCE(split_between, 1)
          WHEN price IS NOT NULL THEN price / COALESCE(split_between, 1)
          ELSE 0
        END
      ), 0)
      FROM activities 
      WHERE trip_id = NEW.trip_id AND is_paid = true
    )
    WHERE id = NEW.trip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE trips 
    SET total_spent = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN actual_cost IS NOT NULL THEN actual_cost / COALESCE(split_between, 1)
          WHEN price IS NOT NULL THEN price / COALESCE(split_between, 1)
          ELSE 0
        END
      ), 0)
      FROM activities 
      WHERE trip_id = OLD.trip_id AND is_paid = true
    )
    WHERE id = OLD.trip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activities table
DROP TRIGGER IF EXISTS update_trip_spent_trigger ON activities;
CREATE TRIGGER update_trip_spent_trigger
AFTER INSERT OR UPDATE OF actual_cost, price, is_paid, split_between OR DELETE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_trip_total_spent();

-- Update existing trips to calculate initial total_spent
UPDATE trips 
SET total_spent = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN a.actual_cost IS NOT NULL THEN a.actual_cost / COALESCE(a.split_between, 1)
      WHEN a.price IS NOT NULL THEN a.price / COALESCE(a.split_between, 1)
      ELSE 0
    END
  ), 0)
  FROM activities a
  WHERE a.trip_id = trips.id AND a.is_paid = true
);