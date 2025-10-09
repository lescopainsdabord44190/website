-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  meta_description text DEFAULT '',
  content jsonb DEFAULT '[]'::jsonb,
  parent_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  show_in_menu boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;