-- Migration: Add reset_token and reset_token_expiry columns to users table
-- Date: 2025-01-XX
-- Purpose: Support password reset functionality

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Password reset token';
COMMENT ON COLUMN users.reset_token_expiry IS 'Token expiry timestamp';

