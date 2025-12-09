-- Migration: 1762300013_auth_hardening
-- Description: Add columns for PBKDF2 and Token Revocation

-- 1. Add Salt column for PBKDF2
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_salt TEXT;

-- 2. Add Token Version for Kill Switch
-- Default is 1. If we increment this to 2, all v1 tokens become invalid (if checked).
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- 3. Comment
COMMENT ON COLUMN users.password_salt IS 'Salt used for PBKDF2 hashing. If NULL, user is on legacy simple hash.';
COMMENT ON COLUMN users.token_version IS 'Current valid token version. Increment to revoke all active tokens for this user.';
