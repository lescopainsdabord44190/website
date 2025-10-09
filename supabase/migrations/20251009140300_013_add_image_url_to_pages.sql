-- Add image_url column to pages table for cover images
ALTER TABLE pages ADD COLUMN IF NOT EXISTS image_url TEXT;


