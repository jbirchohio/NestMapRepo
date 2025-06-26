-- Migration: Add organization_members table
-- Created: 2025-06-25

-- Create organization_member_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_member_status') THEN
        CREATE TYPE organization_member_status AS ENUM ('active', 'invited', 'suspended', 'inactive');
    END IF;
END$$;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status organization_member_status,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only be a member of an organization once
    CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- Add comment to table
COMMENT ON TABLE organization_members IS 'Represents the many-to-many relationship between users and organizations with role and status information.';

-- Add comments to columns
COMMENT ON COLUMN organization_members.role IS 'The role of the user within the organization';
COMMENT ON COLUMN organization_members.status IS 'The membership status (active, invited, suspended, or inactive)';
COMMENT ON COLUMN organization_members.metadata IS 'Additional metadata about the membership';

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
