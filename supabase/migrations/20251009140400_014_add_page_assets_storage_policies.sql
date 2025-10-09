-- Add storage policies for page_assets bucket
CREATE POLICY "Anyone can read page assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'page_assets');

CREATE POLICY "Authenticated users can upload page assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'page_assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update page assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'page_assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete page assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'page_assets' 
    AND auth.role() = 'authenticated'
  );


