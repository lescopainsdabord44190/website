import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, Check, AlertCircle, Camera, Upload, Trash2 } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

export function ProfilePage() {
  const { user, signOut, refreshAvatar } = useAuth();
  const navigate = useNavigate();
  const { trackEvent } = useTracking();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) {
      loadAvatar();
    }
  }, [user]);

  const loadAvatar = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
      setFirstName(data?.first_name ?? '');
      setLastName(data?.last_name ?? '');
    } catch (err) {
      console.error('Error loading avatar:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 2 MB');
      return;
    }

    setAvatarUploading(true);
    setError('');
    setAvatarSuccess(false);

    try {
      // Supprimer l'ancien avatar s'il existe
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([oldPath]);
        }
      }

      // Upload le nouvel avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Mettre à jour la base de données (profiles)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl
        }, {
          onConflict: 'id'
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setAvatarSuccess(true);
      
      // Rafraîchir l'avatar dans le contexte pour mettre à jour le menu
      refreshAvatar();
      
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Erreur lors de l\'upload de l\'avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;

    setAvatarUploading(true);
    setError('');
    setAvatarSuccess(false);

    try {
      // Supprimer l'avatar du storage
      const avatarPath = avatarUrl.split('/avatars/')[1];
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]);
      }

      // Mettre à jour la base de données pour supprimer l'URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: null
        }, {
          onConflict: 'id'
        });

      if (updateError) throw updateError;

      setAvatarUrl(null);
      setAvatarSuccess(true);
      
      // Rafraîchir l'avatar dans le contexte pour mettre à jour le menu
      refreshAvatar();
      
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setError('Erreur lors de la suppression de l\'avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        setError('Mot de passe actuel incorrect');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Erreur lors de la modification du mot de passe');
      } else {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setProfileError('');
    setProfileSuccess(false);
    setProfileSaving(true);

    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();

    try {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            first_name: nextFirstName || null,
            last_name: nextLastName || null,
          },
          { onConflict: 'id' }
        );

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: nextFirstName || null,
          last_name: nextLastName || null,
        },
      });

      if (metadataError) {
        throw metadataError;
      }

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError('Erreur lors de la mise à jour du nom');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError('');

    try {
      // Supprimer l'avatar si présent
      if (avatarUrl) {
        const avatarPath = avatarUrl.split('/avatars/')[1];
        if (avatarPath) {
          await supabase.storage.from('avatars').remove([avatarPath]);
        }
      }

      // Appeler la fonction RPC pour supprimer le compte
      const { error: deleteError } = await supabase.rpc('delete_own_account');

      if (deleteError) {
        console.error('Delete error:', deleteError);
        setError('Impossible de supprimer le compte. Veuillez réessayer.');
        setIsDeleting(false);
        setShowDeleteDialog(false);
        
        trackEvent(TrackingEvent.ACCOUNT_DELETED, {
          [TrackingProperty.SUCCESS]: false,
          [TrackingProperty.ERROR_MESSAGE]: deleteError.message,
        });
        return;
      }

      trackEvent(TrackingEvent.ACCOUNT_DELETED, {
        [TrackingProperty.SUCCESS]: true,
      });

      // Déconnecter l'utilisateur et rediriger vers la page d'accueil
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Une erreur est survenue lors de la suppression du compte');
      setIsDeleting(false);
      setShowDeleteDialog(false);
      
      trackEvent(TrackingEvent.ACCOUNT_DELETED, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: (err as Error).message,
      });
    }
  };

  const computeInitials = () => {
    if (!user) {
      return '?';
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metadataFirstName =
      typeof metadata.first_name === 'string' ? (metadata.first_name as string) : '';
    const metadataLastName =
      typeof metadata.last_name === 'string' ? (metadata.last_name as string) : '';
    const sourceFirstName = firstName || metadataFirstName;
    const sourceLastName = lastName || metadataLastName;

    const initials = `${sourceFirstName?.[0] ?? ''}${sourceLastName?.[0] ?? ''}`.trim().toUpperCase();

    if (initials) {
      return initials;
    }

    const emailPart = user.email ?? '';
    if (emailPart) {
      return emailPart.substring(0, 2).toUpperCase();
    }

    return '?';
  };

  const fallbackInitials = computeInitials();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informations du compte</h2>
            
            {/* Avatar Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Photo de profil</label>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center text-white font-bold text-3xl border-4 border-gray-100 shadow-md">
                      {fallbackInitials}
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={handleAvatarDelete}
                      disabled={avatarUploading}
                      className="absolute -top-1 -right-1 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group/delete"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white rounded-lg hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {avatarUploading ? 'Upload en cours...' : 'Changer la photo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG ou GIF. Max 2MB.
                  </p>
                  {avatarSuccess && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
                      <Check className="w-4 h-4" />
                      <span>Photo mise à jour !</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-800 font-medium">{user?.email}</p>
              </div>
              <div className="pt-4">
                <label className="text-sm font-medium text-gray-500">Nom d'affichage</label>
                <p className="text-xs text-gray-400 mt-1">
                  Ce nom est utilisé pour vous identifier dans l'application.
                </p>
                <form onSubmit={handleProfileSubmit} className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {profileSuccess && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Check className="w-4 h-4" />
                      <span>Nom mis à jour !</span>
                    </div>
                  )}
                  {profileError && (
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{profileError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? 'Enregistrement...' : 'Enregistrer le nom'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Modifier le mot de passe
            </h2>

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Mot de passe modifié avec succès</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 6 caractères</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#84c19e] transition-all hover:scale-105 font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-5 h-5" />
                {loading ? 'Modification en cours...' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        </div>

        {/* Zone dangereuse - Suppression du compte */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-red-100">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zone dangereuse
            </h2>
            <p className="text-sm text-gray-600">
              La suppression de votre compte est définitive et irréversible.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2">
              Que se passe-t-il lorsque vous supprimez votre compte ?
            </h3>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Toutes vos données personnelles seront supprimées</li>
              <li>Votre photo de profil sera effacée</li>
              <li>Vous perdrez l'accès à votre compte de manière permanente</li>
              <li>Cette action ne peut pas être annulée</li>
            </ul>
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-all hover:scale-105 font-medium shadow-lg flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Supprimer votre compte ?"
        message="Cette action est irréversible. Toutes vos données seront définitivement supprimées et vous ne pourrez plus accéder à votre compte."
        confirmText="Oui, supprimer mon compte"
        cancelText="Annuler"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}


