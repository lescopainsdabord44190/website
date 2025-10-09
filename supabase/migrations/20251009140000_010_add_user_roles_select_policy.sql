-- Add SELECT policy for user_roles table
-- This allows authenticated users to read role information
CREATE POLICY "Users can read their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);


