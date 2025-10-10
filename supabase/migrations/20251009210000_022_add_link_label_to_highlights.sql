-- Add link_label column to featured_highlights
ALTER TABLE public.featured_highlights
ADD COLUMN IF NOT EXISTS link_label TEXT;

