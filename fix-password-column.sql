-- Check if password_hash column exists, if not rename password to password_hash
DO $$
BEGIN
    -- Check if password column exists and password_hash doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Rename password to password_hash
        ALTER TABLE users RENAME COLUMN password TO password_hash;
        RAISE NOTICE 'Renamed column password to password_hash';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Add password_hash column if it doesn't exist at all
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column';
    ELSE
        RAISE NOTICE 'password_hash column already exists';
    END IF;
END $$;

-- Show current columns for verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;