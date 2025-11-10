-- Create storage buckets for counselors and projects
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('counselor_photos', 'counselor_photos', true),
  ('project_images', 'project_images', true)
ON CONFLICT (id) DO NOTHING;

-- Refresh storage policies for counselor photos
DROP POLICY IF EXISTS "Public can view counselor photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload counselor photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update counselor photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete counselor photos" ON storage.objects;

CREATE POLICY "Public can view counselor photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'counselor_photos');

CREATE POLICY "Admins can upload counselor photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'counselor_photos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update counselor photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'counselor_photos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'counselor_photos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete counselor photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'counselor_photos' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Refresh storage policies for project images
DROP POLICY IF EXISTS "Public can view project images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update project images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete project images" ON storage.objects;

CREATE POLICY "Public can view project images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project_images');

CREATE POLICY "Admins can upload project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project_images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update project images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project_images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'project_images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete project images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project_images' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create counselors table
CREATE TABLE IF NOT EXISTS counselors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text,
  role_title text,
  tagline text,
  bio text,
  photo_url text,
  focus_areas text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view counselors" ON counselors;
DROP POLICY IF EXISTS "Only admins can insert counselors" ON counselors;
DROP POLICY IF EXISTS "Only admins can update counselors" ON counselors;
DROP POLICY IF EXISTS "Only admins can delete counselors" ON counselors;

CREATE POLICY "Anyone can view counselors"
  ON counselors FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Only admins can insert counselors"
  ON counselors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update counselors"
  ON counselors FOR UPDATE
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

CREATE POLICY "Only admins can delete counselors"
  ON counselors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  short_description text,
  age_group text,
  cover_image_url text,
  content jsonb DEFAULT jsonb_build_object('time', 0, 'blocks', jsonb_build_array(), 'version', '2.31.0'),
  objectives text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Only admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Only admins can update projects" ON projects;
DROP POLICY IF EXISTS "Only admins can delete projects" ON projects;

CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Only admins can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update projects"
  ON projects FOR UPDATE
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

CREATE POLICY "Only admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create relationship table between projects and counselors
CREATE TABLE IF NOT EXISTS project_counselors (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES counselors(id) ON DELETE CASCADE,
  role text,
  PRIMARY KEY (project_id, counselor_id)
);

ALTER TABLE project_counselors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view project counselors" ON project_counselors;
DROP POLICY IF EXISTS "Only admins can insert project counselors" ON project_counselors;
DROP POLICY IF EXISTS "Only admins can update project counselors" ON project_counselors;
DROP POLICY IF EXISTS "Only admins can delete project counselors" ON project_counselors;

CREATE POLICY "Anyone can view project counselors"
  ON project_counselors FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_counselors.project_id
      AND projects.is_active = true
    )
  );

CREATE POLICY "Only admins can insert project counselors"
  ON project_counselors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update project counselors"
  ON project_counselors FOR UPDATE
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

CREATE POLICY "Only admins can delete project counselors"
  ON project_counselors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Seed counselors
INSERT INTO counselors (slug, first_name, last_name, role_title, tagline, bio, focus_areas, is_active, updated_at)
VALUES
  (
    'sandy',
    'Sandy',
    NULL,
    'Animatrice référente',
    'Une énergie communicative pour les pré-ados',
    'Sandy imagine des temps forts pour encourager les grands à prendre des initiatives et à construire leurs projets collectifs.',
    ARRAY['Autonomie', 'Expression collective'],
    true,
    now()
  ),
  (
    'angelique',
    'Angélique',
    NULL,
    'Animatrice référente',
    'Sensibiliser en douceur au zéro déchet',
    'Angélique accompagne les enfants vers des habitudes responsables avec des ateliers culinaires et des défis anti-gaspillage.',
    ARRAY['Éco-responsabilité', 'Cuisine'],
    true,
    now()
  ),
  (
    'cindy',
    'Cindy',
    NULL,
    'Animatrice référente',
    'Créer des passerelles avec la nature et le territoire',
    'Cindy cultive le lien au vivant et aux partenaires locaux à travers des activités en extérieur et du jardinage partagé.',
    ARRAY['Nature', 'Partenariats locaux'],
    true,
    now()
  ),
  (
    'chrystelle',
    'Chrystelle',
    NULL,
    'Animatrice référente',
    'Relier les générations avec bienveillance',
    'Chrystelle facilite des rencontres chaleureuses entre enfants et aîné·es pour partager des souvenirs et des savoir-faire.',
    ARRAY['Intergénérationnel', 'Médiation'],
    true,
    now()
  ),
  (
    'wiliam',
    'Wiliam',
    NULL,
    'Animateur référent',
    'Découvrir la cuisine en s’amusant',
    'Wiliam initie les enfants aux bases de la cuisine à travers des ateliers gourmands et sécurisés.',
    ARRAY['Cuisine', 'Pédagogie active'],
    true,
    now()
  )
ON CONFLICT (slug) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role_title = EXCLUDED.role_title,
  tagline = EXCLUDED.tagline,
  bio = EXCLUDED.bio,
  focus_areas = EXCLUDED.focus_areas,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed projects
INSERT INTO projects (slug, title, subtitle, short_description, age_group, cover_image_url, content, objectives, is_active, updated_at)
VALUES
  (
    'gang-de-potes',
    'Gang de potes',
    'Un programme pour les CM1-CM2',
    'Des temps forts pour les plus grands, pensés avec eux et pour eux.',
    'CM1 - CM2',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Le projet « Gang de potes » offre aux pré-ados un espace pour se retrouver, débattre et construire des actions qui leur ressemblent.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Sorties co-construites avec le groupe',
              'Ateliers pour développer la prise d’initiative',
              'Moments conviviaux pour renforcer l’esprit d’équipe'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Autonomie', 'Pré-adolescence'],
    true,
    now()
  ),
  (
    'gouter-zero-dechet',
    'Goûter zéro déchet',
    'Réinventer la pause gourmande',
    'Un projet pour réduire les déchets et valoriser une alimentation durable.',
    'À partir du CP',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Les enfants apprennent à composer des goûters savoureux en limitant les emballages grâce à des ateliers pratiques et des défis collectifs.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Ateliers cuisine avec des produits locaux',
              'Création de boîtes à goûter réutilisables',
              'Sensibilisation au tri et au compost'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Éco-responsabilité', 'Alimentation'],
    true,
    now()
  ),
  (
    'jardin-partage',
    'Jardin partagé',
    'Cultiver ensemble au Vallon',
    'Un jardin co-animé avec l’ESAT pour découvrir, planter et récolter.',
    'À partir du CE1',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Avec les résidents de l’ESAT du Vallon, les enfants entretiennent un jardin partagé où l’on apprend la patience, la solidarité et le respect de la nature.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Plantations saisonnières et découverte des légumes',
              'Ateliers sensoriels autour du jardin',
              'Moments de partage avec les partenaires de l’ESAT'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Nature', 'Partenariats'],
    true,
    now()
  ),
  (
    'lien-intergenerationnel',
    'Lien intergénérationnel',
    'Des ponts avec l’EHPAD des 3 clochers',
    'Créer des rencontres régulières entre enfants et résident·es de l’EHPAD.',
    'Tout âge',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Ce projet tisse des liens entre générations autour d’activités créatives, culinaires ou de simples moments d’échange.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Rencontres thématiques à l’EHPAD',
              'Ateliers mémoire et partage de souvenirs',
              'Création de supports communs (albums, expositions)'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Solidarité', 'Lien social'],
    true,
    now()
  ),
  (
    'atelier-cuisine',
    'Cuisine découverte',
    'Apprendre les bases en s’amusant',
    'Des ateliers accessibles pour cuisiner en autonomie et en sécurité.',
    'À partir du CE2',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Chaque séance propose une recette simple pour développer le goût, la coordination et l’entraide.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Découvrir les ustensiles et les gestes de base',
              'Apprendre l’hygiène alimentaire',
              'Mettre en valeur la coopération en cuisine'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Cuisine', 'Autonomie'],
    true,
    now()
  ),
  (
    'agencement-des-espaces',
    'Agencement des espaces',
    'Imaginer des univers immersifs',
    'Concevoir et fabriquer des coins thématiques pour des expériences inédites.',
    'Multi-âges',
    NULL,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Les enfants participent à la création d’espaces immersifs : cabanes, coins lecture, mini-laboratoires... tout est possible !'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Co-conception des décors et du mobilier',
              'Utilisation de matériaux de récupération',
              'Valorisation de l’imaginaire collectif'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    ARRAY['Créativité', 'Design d’espaces'],
    true,
    now()
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  short_description = EXCLUDED.short_description,
  age_group = EXCLUDED.age_group,
  cover_image_url = COALESCE(EXCLUDED.cover_image_url, projects.cover_image_url),
  content = EXCLUDED.content,
  objectives = EXCLUDED.objectives,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Link counselors to projects
WITH counselor_map AS (
  SELECT slug, id FROM counselors WHERE slug IN ('sandy', 'angelique', 'cindy', 'chrystelle', 'wiliam')
),
project_map AS (
  SELECT slug, id FROM projects WHERE slug IN (
    'gang-de-potes',
    'gouter-zero-dechet',
    'jardin-partage',
    'lien-intergenerationnel',
    'atelier-cuisine',
    'agencement-des-espaces'
  )
)
INSERT INTO project_counselors (project_id, counselor_id, role)
SELECT pm.id, cm.id, mapping.role
FROM (
  VALUES
    ('gang-de-potes', 'sandy', 'Animatrice référente'),
    ('gouter-zero-dechet', 'angelique', 'Animatrice référente'),
    ('jardin-partage', 'cindy', 'Animatrice référente'),
    ('lien-intergenerationnel', 'chrystelle', 'Animatrice référente'),
    ('atelier-cuisine', 'wiliam', 'Animateur référent'),
    ('agencement-des-espaces', 'sandy', 'Animatrice référente')
) AS mapping(project_slug, counselor_slug, role)
JOIN project_map pm ON pm.slug = mapping.project_slug
JOIN counselor_map cm ON cm.slug = mapping.counselor_slug
ON CONFLICT (project_id, counselor_id) DO UPDATE
SET role = EXCLUDED.role;

-- Upsert main page and child pages for L'accueil de loisirs
WITH main_page AS (
  INSERT INTO pages (
    title,
    slug,
    meta_description,
    content,
    show_in_menu,
    order_index,
    is_active,
    show_toc,
    updated_at
  )
  VALUES (
    'L''accueil de loisirs',
    'accueil-de-loisirs',
    'Découvrez l’accueil de loisirs associatif des Copains d''abord : projet éducatif, équipe et fonctionnement.',
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'header',
          'data', jsonb_build_object(
            'text', 'Grandir, découvrir, partager',
            'level', 2
          )
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Notre accueil de loisirs propose toute l’année des expériences riches et bienveillantes, en s’appuyant sur un projet éducatif associatif et une équipe d’animation engagée.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Une structure associative ancrée sur le territoire',
              'Un projet pédagogique évolutif et participatif',
              'Une équipe d’animation aux talents complémentaires'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    true,
    20,
    true,
    true,
    now()
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    meta_description = EXCLUDED.meta_description,
    content = EXCLUDED.content,
    show_in_menu = EXCLUDED.show_in_menu,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    show_toc = EXCLUDED.show_toc,
    updated_at = now()
  RETURNING id
),
content_blocks AS (
  SELECT 
    'l-association'::text AS slug,
    'L''association'::text AS title,
    'Une association impliquée pour porter l’accueil de loisirs.'::text AS meta_description,
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'L’association « Les copains d’abord » réunit familles, bénévoles et partenaires locaux pour garantir un accueil de loisirs ouvert à toutes et tous.'
          )
        ),
        jsonb_build_object(
          'type', 'header',
          'data', jsonb_build_object(
            'text', 'Nos missions associatives',
            'level', 3
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Assurer la gestion et le pilotage du centre de loisirs',
              'Favoriser l’implication des familles et des bénévoles',
              'Développer des partenariats solidaires sur le territoire'
            )
          )
        )
      ),
      'version', '2.31.0'
    ) AS content,
    10 AS order_index,
    true AS show_toc
  UNION ALL
  SELECT
    'projet-pedagogique',
    'Le projet pédagogique',
    'Les principes éducatifs qui guident nos animations.',
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Nous proposons des expériences variées pour accompagner chaque enfant dans ses découvertes, son autonomie et sa citoyenneté.'
          )
        ),
        jsonb_build_object(
          'type', 'list',
          'data', jsonb_build_object(
            'style', 'unordered',
            'items', jsonb_build_array(
              'Un cadre sécurisant et bienveillant',
              'Des projets co-construits avec les enfants',
              'Une ouverture constante sur le territoire et ses partenaires'
            )
          )
        )
      ),
      'version', '2.31.0'
    ),
    20,
    true
  UNION ALL
  SELECT
    'equipe',
    'L''équipe',
    'Rencontrez l’équipe d’animation et leurs projets phares.',
    jsonb_build_object(
      'time', (extract(epoch from now()) * 1000)::bigint,
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'data', jsonb_build_object(
            'text',
            'Une équipe passionnée porte au quotidien des projets variés pour tous les âges. Découvrez leurs profils et les projets qu’ils animent.'
          )
        ),
        jsonb_build_object(
          'type', 'anim-list',
          'data', jsonb_build_object(
            'counselorSlugs', jsonb_build_array('sandy', 'angelique', 'cindy', 'chrystelle', 'wiliam')
          )
        )
      ),
      'version', '2.31.0'
    ),
    30,
    true
)
INSERT INTO pages (
  title,
  slug,
  meta_description,
  content,
  parent_id,
  order_index,
  is_active,
  show_in_menu,
  show_toc,
  updated_at
)
SELECT
  cb.title,
  cb.slug,
  cb.meta_description,
  cb.content,
  mp.id,
  cb.order_index,
  true,
  false,
  cb.show_toc,
  now()
FROM content_blocks cb
CROSS JOIN main_page mp
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  content = EXCLUDED.content,
  parent_id = EXCLUDED.parent_id,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  show_in_menu = EXCLUDED.show_in_menu,
  show_toc = EXCLUDED.show_toc,
  updated_at = now();

