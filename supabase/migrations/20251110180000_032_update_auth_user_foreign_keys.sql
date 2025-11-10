-- Drop and recreate foreign keys so that deleting an auth user nullifies references

ALTER TABLE site_settings
  DROP CONSTRAINT IF EXISTS site_settings_updated_by_fkey;

ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE pages
  DROP CONSTRAINT IF EXISTS pages_created_by_fkey;

ALTER TABLE pages
  ADD CONSTRAINT pages_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE pages
  DROP CONSTRAINT IF EXISTS pages_updated_by_fkey;

ALTER TABLE pages
  ADD CONSTRAINT pages_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE featured_highlights
  DROP CONSTRAINT IF EXISTS featured_highlights_created_by_fkey;

ALTER TABLE featured_highlights
  ADD CONSTRAINT featured_highlights_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE featured_highlights
  DROP CONSTRAINT IF EXISTS featured_highlights_updated_by_fkey;

ALTER TABLE featured_highlights
  ADD CONSTRAINT featured_highlights_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;


