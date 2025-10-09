-- Add SELECT policy for site_settings table
-- Allow everyone to read site settings (needed for public pages like header/footer)
CREATE POLICY "Everyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);


