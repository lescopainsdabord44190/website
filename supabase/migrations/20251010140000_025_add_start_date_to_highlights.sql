-- Add start_date column to featured_highlights
ALTER TABLE public.featured_highlights
ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when filtering by start date
CREATE INDEX IF NOT EXISTS featured_highlights_start_date_idx ON public.featured_highlights(start_date);

-- Update the public view policy to check start and end dates
DROP POLICY IF EXISTS "Featured highlights are viewable by everyone" ON public.featured_highlights;

CREATE POLICY "Featured highlights are viewable by everyone"
  ON public.featured_highlights
  FOR SELECT
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date > NOW())
  );

