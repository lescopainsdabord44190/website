-- Add partners list setting
INSERT INTO site_settings (key, value, description, type)
VALUES (
  'partners_list',
  '[]',
  'Liste des partenaires à afficher dans le footer',
  'images'
)
ON CONFLICT (key) DO NOTHING;

-- Update comment to include images type
COMMENT ON COLUMN site_settings.type IS 'Type of setting: text (simple text), richtext (EditorJS content), images (collection of images with title and link)';

