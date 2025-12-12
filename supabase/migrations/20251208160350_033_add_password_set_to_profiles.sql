-- Add password_set column to profiles table to track if user has set their password
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_set boolean DEFAULT false;

-- Set password_set to true for existing users (they already have passwords)
UPDATE profiles
SET password_set = true
WHERE password_set IS NULL OR password_set = false;

-- Ensure default value is false for new rows
ALTER TABLE profiles
  ALTER COLUMN password_set SET DEFAULT false;



