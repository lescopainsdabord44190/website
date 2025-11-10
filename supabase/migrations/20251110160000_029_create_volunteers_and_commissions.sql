-- Create volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text,
  role_title text,
  bio text,
  photo_url text,
  is_executive_member boolean DEFAULT false,
  is_board_member boolean DEFAULT false,
  mandate_start_date date,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admins can insert volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admins can update volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admins can delete volunteers" ON volunteers;

CREATE POLICY "Public can view active volunteers"
  ON volunteers FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can insert volunteers"
  ON volunteers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update volunteers"
  ON volunteers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete volunteers"
  ON volunteers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can insert commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can update commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can delete commissions" ON commissions;

CREATE POLICY "Public can view active commissions"
  ON commissions FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete commissions"
  ON commissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create relationship table between volunteers and commissions
CREATE TABLE IF NOT EXISTS commission_volunteers (
  commission_id uuid REFERENCES commissions(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES volunteers(id) ON DELETE CASCADE,
  role text,
  notes text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (commission_id, volunteer_id)
);

ALTER TABLE commission_volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view commission volunteers" ON commission_volunteers;
DROP POLICY IF EXISTS "Admins can insert commission volunteers" ON commission_volunteers;
DROP POLICY IF EXISTS "Admins can update commission volunteers" ON commission_volunteers;
DROP POLICY IF EXISTS "Admins can delete commission volunteers" ON commission_volunteers;

CREATE POLICY "Public can view commission volunteers"
  ON commission_volunteers FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM commissions
      WHERE commissions.id = commission_volunteers.commission_id
      AND commissions.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM volunteers
      WHERE volunteers.id = commission_volunteers.volunteer_id
      AND volunteers.is_active = true
    )
  );

CREATE POLICY "Admins can insert commission volunteers"
  ON commission_volunteers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update commission volunteers"
  ON commission_volunteers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete commission volunteers"
  ON commission_volunteers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Seed commissions
INSERT INTO commissions (slug, title, order_index, is_active)
VALUES
  ('communication', 'Communication', 0, true),
  ('ecologie', 'Écologie', 1, true),
  ('parentalite', 'Parentalité', 2, true),
  ('evenement', 'Événement', 3, true),
  ('ressources-humaines', 'Ressources humaines', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed volunteers
INSERT INTO volunteers (slug, first_name, last_name, role_title, is_executive_member, is_board_member, mandate_start_date, order_index, is_active)
VALUES
  ('leny-bernard', 'Leny', 'Bernard', 'Président', true, true, DATE '2021-05-01', 0, true),
  ('melanie-baillard', 'Mélanie', 'Baillard', 'Trésorière', true, true, NULL, 1, true),
  ('edith-ramirez', 'Edith', 'Ramirez', 'Trésorière adjointe', true, true, NULL, 2, true),
  ('pauline-jolly', 'Pauline', 'Jolly', 'Secrétaire', true, true, NULL, 3, true),
  ('rachel-bonneau', 'Rachel', 'Bonneau', 'Secrétaire adjointe', true, true, NULL, 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Link volunteers to commissions
WITH volunteer_ids AS (
  SELECT id, slug FROM volunteers
  WHERE slug IN ('leny-bernard', 'melanie-baillard', 'edith-ramirez', 'pauline-jolly', 'rachel-bonneau')
),
commission_ids AS (
  SELECT id, slug FROM commissions
  WHERE slug IN ('communication', 'ecologie', 'parentalite', 'evenement', 'ressources-humaines')
)
INSERT INTO commission_volunteers (commission_id, volunteer_id)
SELECT c.id, v.id
FROM (
  VALUES
    ('communication', 'leny-bernard'),
    ('ecologie', 'leny-bernard'),
    ('parentalite', 'leny-bernard'),
    ('communication', 'melanie-baillard'),
    ('evenement', 'melanie-baillard'),
    ('parentalite', 'melanie-baillard'),
    ('communication', 'edith-ramirez'),
    ('ressources-humaines', 'edith-ramirez'),
    ('parentalite', 'pauline-jolly'),
    ('communication', 'pauline-jolly'),
    ('ressources-humaines', 'pauline-jolly'),
    ('parentalite', 'rachel-bonneau')
) AS mapping(commission_slug, volunteer_slug)
JOIN commission_ids AS c ON c.slug = mapping.commission_slug
JOIN volunteer_ids AS v ON v.slug = mapping.volunteer_slug
ON CONFLICT (commission_id, volunteer_id) DO NOTHING;


