-- Create storage bucket for volunteer photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('volunteer_photos', 'volunteer_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Refresh storage policies for volunteer photos
DROP POLICY IF EXISTS "Public can view volunteer photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload volunteer photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update volunteer photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete volunteer photos" ON storage.objects;

CREATE POLICY "Public can view volunteer photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'volunteer_photos');

CREATE POLICY "Admins can upload volunteer photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'volunteer_photos' AND
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update volunteer photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'volunteer_photos' AND
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'volunteer_photos' AND
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete volunteer photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'volunteer_photos' AND
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );


