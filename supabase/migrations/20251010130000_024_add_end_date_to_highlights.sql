-- Add end_date column to featured_highlights
ALTER TABLE public.featured_highlights
ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when filtering expired highlights
CREATE INDEX IF NOT EXISTS featured_highlights_end_date_idx ON public.featured_highlights(end_date);

-- Update the public view policy to exclude expired highlights
DROP POLICY IF EXISTS "Featured highlights are viewable by everyone" ON public.featured_highlights;

CREATE POLICY "Featured highlights are viewable by everyone"
  ON public.featured_highlights
  FOR SELECT
  USING (
    is_active = true 
    AND (end_date IS NULL OR end_date > NOW())
  );

