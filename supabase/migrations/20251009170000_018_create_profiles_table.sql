-- Créer la table profiles pour stocker les informations de profil utilisateur
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy pour que tout le monde puisse voir les profils publics
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Policy pour que les utilisateurs puissent insérer leur propre profil
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy pour que les utilisateurs puissent mettre à jour leur propre profil
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrer les données existantes de avatar_url depuis user_roles vers profiles
INSERT INTO profiles (id, avatar_url)
SELECT user_id, avatar_url 
FROM user_roles 
WHERE avatar_url IS NOT NULL
ON CONFLICT (id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url;

-- Supprimer la colonne avatar_url de user_roles (optionnel, à décommenter si souhaité)
-- ALTER TABLE user_roles DROP COLUMN IF EXISTS avatar_url;



