-- Fonction pour permettre aux utilisateurs de supprimer leur propre compte
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est connecté
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Supprimer les données de l'utilisateur dans user_roles
  DELETE FROM user_roles WHERE user_roles.user_id = user_id;
  
  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Donner les permissions aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;




