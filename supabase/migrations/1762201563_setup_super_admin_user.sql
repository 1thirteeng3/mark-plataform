-- Migration: setup_super_admin_user
-- Created at: 1762201563

-- Make school_id nullable for SUPER_ADMIN users
ALTER TABLE users ALTER COLUMN school_id DROP NOT NULL;

-- Create initial SUPER_ADMIN user (password is 'password123' - same as test users)
INSERT INTO users (id, school_id, name, email, password_hash, role, created_at)
VALUES (
  gen_random_uuid(),
  NULL,
  'Mark Platform Admin',
  'admin@mark.local',
  'password123_hash',
  'SUPER_ADMIN',
  NOW()
)
ON CONFLICT (email) DO NOTHING;;