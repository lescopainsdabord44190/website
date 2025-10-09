-- Add show_in_footer column to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_in_footer boolean DEFAULT false;

