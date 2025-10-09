-- Storage policies for page-images bucket
CREATE POLICY "Public can view page images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'page-images');

CREATE POLICY "Admins can upload page images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'page-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update page images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'page-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'page-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete page images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'page-images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );