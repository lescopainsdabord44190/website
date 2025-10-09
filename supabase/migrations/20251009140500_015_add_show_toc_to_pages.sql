-- Add show_toc column to pages table to control table of contents visibility
ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_toc BOOLEAN DEFAULT true;





