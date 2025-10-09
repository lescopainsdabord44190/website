-- Add SELECT policy for pages table
-- Allow everyone (including anonymous users) to read active pages
-- Authenticated users can read all pages (including inactive ones for admin)
CREATE POLICY "Everyone can read active pages"
  ON pages FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');


