-- Insert default site settings
INSERT INTO site_settings (key, value, description) VALUES
  ('site_title', 'Les copains d''abord', 'Titre du site'),
  ('site_subtitle', 'Accueil de loisirs - Gétigné', 'Sous-titre du site'),
  ('contact_phone', '', 'Numéro de téléphone'),
  ('contact_email', 'contact@alsh-getigne.fr', 'Email de contact'),
  ('home_hero_title', 'Bienvenue aux Copains d''abord', 'Titre de la page d''accueil'),
  ('home_hero_subtitle', 'L''accueil de loisirs qui fait grandir vos enfants dans la joie et la bonne humeur !', 'Sous-titre de la page d''accueil'),
  ('footer_content', '© 2025 Les copains d''abord - Gétigné', 'Contenu du footer')
ON CONFLICT (key) DO NOTHING;