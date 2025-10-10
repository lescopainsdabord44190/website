-- Create featured_highlights table
CREATE TABLE IF NOT EXISTS public.featured_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"time":0,"blocks":[],"version":"2.28.0"}',
  link TEXT,
  gradient_theme TEXT NOT NULL DEFAULT 'blue-green',
  icon TEXT NOT NULL DEFAULT 'Lightbulb',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS featured_highlights_order_index_idx ON public.featured_highlights(order_index);
CREATE INDEX IF NOT EXISTS featured_highlights_is_active_idx ON public.featured_highlights(is_active);

-- Enable RLS
ALTER TABLE public.featured_highlights ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view active highlights
CREATE POLICY "Featured highlights are viewable by everyone"
  ON public.featured_highlights
  FOR SELECT
  USING (is_active = true);

-- Admins can view all highlights
CREATE POLICY "Admins can view all featured highlights"
  ON public.featured_highlights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can create highlights
CREATE POLICY "Admins can create featured highlights"
  ON public.featured_highlights
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can update highlights
CREATE POLICY "Admins can update featured highlights"
  ON public.featured_highlights
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can delete highlights
CREATE POLICY "Admins can delete featured highlights"
  ON public.featured_highlights
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

