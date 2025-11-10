-- Update counselor policies to allow admin access to inactive records and ensure updates succeed
DROP POLICY IF EXISTS "Anyone can view counselors" ON counselors;

CREATE POLICY "Public can view active counselors"
  ON counselors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view counselors"
  ON counselors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can insert counselors" ON counselors;
DROP POLICY IF EXISTS "Only admins can update counselors" ON counselors;
DROP POLICY IF EXISTS "Only admins can delete counselors" ON counselors;

CREATE POLICY "Admins can insert counselors"
  ON counselors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update counselors"
  ON counselors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete counselors"
  ON counselors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );


