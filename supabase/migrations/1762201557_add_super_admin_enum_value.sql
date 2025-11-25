-- Migration: add_super_admin_enum_value
-- Created at: 1762201557

-- Add SUPER_ADMIN role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';;