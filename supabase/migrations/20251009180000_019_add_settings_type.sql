-- Add type column to site_settings
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'text';

-- Update existing settings to have type 'text'
UPDATE site_settings SET type = 'text' WHERE type IS NULL;

-- Add the new footer_additionalContent setting with richtext type
INSERT INTO site_settings (key, value, description, type)
VALUES (
  'footer_additionalContent',
  '{"time":1,"blocks":[],"version":"2.28.0"}',
  'Contenu additionnel pour le pied de page',
  'richtext'
)
ON CONFLICT (key) DO NOTHING;

-- Add comment to the type column
COMMENT ON COLUMN site_settings.type IS 'Type of setting: text (simple text), richtext (EditorJS content)';



