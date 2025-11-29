-- Authority Types and Admin Panel Schema Updates
-- Run this AFTER schema.sql and schema_updates.sql

-- Update users table to support registration and authority types
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('tourist', 'merchant', 'municipality', 'beach_authority', 'forest_department', 'admin'));

-- Authority Types Table
CREATE TABLE IF NOT EXISTS authority_types (
  authority_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  authority_type TEXT NOT NULL CHECK (authority_type IN ('municipality', 'beach_authority', 'forest_department')),
  department_name TEXT,
  jurisdiction_area TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Actions Log
CREATE TABLE IF NOT EXISTS admin_actions (
  action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_authority_types_user ON authority_types(user_id);
CREATE INDEX IF NOT EXISTS idx_authority_types_type ON authority_types(authority_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);

-- Function to create user with role
CREATE OR REPLACE FUNCTION create_user_with_role(
  phone_param TEXT,
  email_param TEXT,
  name_param TEXT,
  role_param TEXT,
  created_by_admin_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO users (phone_number, email, name, role)
  VALUES (phone_param, email_param, name_param, role_param)
  RETURNING id INTO new_user_id;

  -- If created by admin, log the action
  IF created_by_admin_id IS NOT NULL THEN
    INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
    VALUES (created_by_admin_id, 'create_user', new_user_id, jsonb_build_object('role', role_param));
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

