-- Add created_by column to activities table
ALTER TABLE activities 
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Set default value for existing records
UPDATE activities 
SET created_by = (
    SELECT id FROM users 
    WHERE email = 'system@example.com' 
    LIMIT 1
);

-- Make the column required for new records
ALTER TABLE activities 
ALTER COLUMN created_by SET NOT NULL;
