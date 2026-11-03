-- Ajout du paramètre home_hero_image pour personnaliser l'image principale de la page d'accueil
INSERT INTO "public"."site_settings" ("key", "value", "description", "type")
VALUES (
  'home_hero_image',
  '/photos/team.jpg',
  'Image principale de la page d''accueil',
  'image'
)
ON CONFLICT ("key") DO NOTHING;

COMMENT ON COLUMN "public"."site_settings"."type" IS 'Type of setting: text (simple text), richtext (EditorJS content), image (single optimized image), images (collection of images with title and link)';
