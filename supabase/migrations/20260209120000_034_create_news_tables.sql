-- Blog / Actualités : catégories, tags, articles, bucket d'images

-- Catégories
CREATE TABLE IF NOT EXISTS news_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view news categories"
  ON news_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins and editors can insert news categories"
  ON news_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can update news categories"
  ON news_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete news categories"
  ON news_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- Tags
CREATE TABLE IF NOT EXISTS news_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view news tags"
  ON news_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins and editors can insert news tags"
  ON news_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can update news tags"
  ON news_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete news tags"
  ON news_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- Articles
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text DEFAULT '',
  content jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category_id uuid REFERENCES news_categories(id) ON DELETE SET NULL,
  image_url text,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_news_articles_status_published_at ON news_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category_id);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published news articles"
  ON news_articles FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Admins and editors can view all news articles"
  ON news_articles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can insert news articles"
  ON news_articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can update news articles"
  ON news_articles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete news articles"
  ON news_articles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- Article <> Tags pivot
CREATE TABLE IF NOT EXISTS news_article_tags (
  article_id uuid REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES news_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

ALTER TABLE news_article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tags of published news articles"
  ON news_article_tags FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM news_articles
      WHERE news_articles.id = news_article_tags.article_id
      AND news_articles.status = 'published'
    )
  );

CREATE POLICY "Admins and editors can view all news article tags"
  ON news_article_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can insert news article tags"
  ON news_article_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete news article tags"
  ON news_article_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- Bucket de stockage pour les visuels d'articles
INSERT INTO storage.buckets (id, name, public)
VALUES ('news', 'news', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de bucket
CREATE POLICY "Public can view news images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'news');

CREATE POLICY "Admins and editors can insert news images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'news' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can update news images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'news' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'news' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete news images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'news' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'editor')
    )
  );
