import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Camera, Shield, ShieldOff, Trash2, Upload, RefreshCw, Check, PenSquare } from 'lucide-react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { PasswordInput } from '../../components/PasswordInput';
import { supabase } from '../../lib/supabase';

interface PasswordFormState {
  newPassword: string;
  confirmPassword: string;
}

export function UserEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getUserById,
    updateProfile,
    updateUserRole,
    toggleActiveStatus,
    updatePassword,
  } = useAdminUsers();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [initialIsAdmin, setInitialIsAdmin] = useState(false);
  const [initialIsEditor, setInitialIsEditor] = useState(false);
  const [initialIsActive, setInitialIsActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      if (!id) {
        setError('Utilisateur introuvable');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getUserById(id);
      if (!isMounted) return;

      if (!result.success || !result.data) {
        setError(
          result.error instanceof Error
            ? result.error.message
            : 'Impossible de charger cet utilisateur'
        );
        setLoading(false);
        return;
      }

      const user = result.data;
      setInitialIsAdmin(user.is_admin);
      setInitialIsEditor(user.is_editor);
      setInitialIsActive(user.is_active);
      setIsAdmin(user.is_admin);
      setIsEditor(user.is_editor);
      setIsActive(user.is_active);
      setAvatarUrl(user.avatar_url);
      setEmail(user.email);
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [getUserById, id]);

  const displayName = useMemo(() => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || email || 'Utilisateur';
  }, [firstName, lastName, email]);

  const avatarInitials = useMemo(() => {
    const initials =
      `${firstName?.trim()?.[0] ?? ''}${lastName?.trim()?.[0] ?? ''}`.trim().toUpperCase();
    if (initials) {
      return initials;
    }

    if (email) {
      const localPart = email.split('@')[0];
      if (localPart.includes('.')) {
        const segments = localPart.split('.');
        const combined = `${segments[0]?.[0] ?? ''}${segments[1]?.[0] ?? ''}`.toUpperCase();
        if (combined.trim()) {
          return combined;
        }
      }
      return localPart.substring(0, 2).toUpperCase() || email.substring(0, 2).toUpperCase();
    }

    return '?';
  }, [firstName, lastName, email]);

  if (!id) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <p className="text-red-600">Identifiant utilisateur manquant.</p>
      </div>
    );
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: Record<string, string | null> = {
        first_name: firstName ?? null,
        last_name: lastName ?? null,
      };

      const profileResult = await updateProfile(id, updates);

      if (!profileResult.success) {
        throw profileResult.error ?? new Error('Impossible de mettre à jour le profil');
      }

      if (isAdmin !== initialIsAdmin) {
        const roleResult = await updateUserRole(id, 'admin', isAdmin);
        if (!roleResult.success) {
          throw roleResult.error ?? new Error('Impossible de mettre à jour le rôle administrateur');
        }
        setInitialIsAdmin(isAdmin);
      }

      if (isEditor !== initialIsEditor) {
        const roleResult = await updateUserRole(id, 'editor', isEditor);
        if (!roleResult.success) {
          throw roleResult.error ?? new Error('Impossible de mettre à jour le rôle éditeur');
        }
        setInitialIsEditor(isEditor);
      }

      if (isActive !== initialIsActive) {
        const statusResult = await toggleActiveStatus(id, isActive);
        if (!statusResult.success) {
          throw statusResult.error ?? new Error('Impossible de mettre à jour le statut');
        }
        setInitialIsActive(isActive);
      }

      setSuccess('Profil mis à jour avec succès');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setPasswordLoading(true);

    try {
      const result = await updatePassword(id, passwordForm.newPassword);

      if (!result.success) {
        throw result.error ?? new Error('Impossible de mettre à jour le mot de passe');
      }

      setPasswordSuccess('Mot de passe mis à jour avec succès');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors du changement de mot de passe';
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 MB");
      return;
    }

    setAvatarLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const updateResult = await updateProfile(id, { avatar_url: publicUrl });
      if (!updateResult.success) {
        throw updateResult.error ?? new Error("Impossible d'enregistrer la photo");
      }

      setAvatarUrl(publicUrl);
      setSuccess('Photo de profil mise à jour');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors du téléchargement de la photo';
      setError(message);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!avatarUrl) return;

    setAvatarLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const avatarPath = avatarUrl.split('/avatars/')[1];
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]);
      }

      const result = await updateProfile(id, { avatar_url: null });
      if (!result.success) {
        throw result.error ?? new Error("Impossible de supprimer l'avatar");
      }

      setAvatarUrl(null);
      setSuccess('Photo de profil supprimée');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression de la photo';
      setError(message);
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/admin/users')}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la liste
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Modifier {displayName}</h1>
            {email && <p className="text-sm text-gray-500">{email}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#328fce]/10 text-[#328fce] text-sm font-medium">
                <Shield className="w-4 h-4" />
                Administrateur·rice
              </span>
            )}
            {isEditor && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <PenSquare className="w-4 h-4" />
                Éditeur·rice
              </span>
            )}
            {!isAdmin && !isEditor && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                <ShieldOff className="w-4 h-4" />
                Membre standard
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
          </div>
        ) : (
          <>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSave}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Photo de profil</h2>
                  <p className="text-sm text-gray-500">
                    Téléchargez ou remplacez la photo de profil de cet utilisateur.
                  </p>
                </div>
                <div className="lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative group">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center text-white font-bold text-3xl border-4 border-gray-100 shadow-md">
                        {avatarInitials}
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
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={avatarLoading}
                        className="absolute -top-1 -right-1 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={avatarLoading}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {avatarLoading ? 'Upload en cours...' : 'Changer la photo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF. Max 2 MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Informations</h2>
                  <p className="text-sm text-gray-500">
                    Mettez à jour les informations principales de l’utilisateur.
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={firstName ?? ''}
                        onChange={(event) => setFirstName(event.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={lastName ?? ''}
                        onChange={(event) => setLastName(event.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email ?? ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      L’email ne peut pas être modifié depuis cette interface.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isAdmin}
                        onChange={(event) => setIsAdmin(event.target.checked)}
                        className="w-4 h-4 border-gray-300 rounded"
                      />
                      Donne le rôle administrateur
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isEditor}
                        onChange={(event) => setIsEditor(event.target.checked)}
                        className="w-4 h-4 border-gray-300 rounded"
                      />
                      Donne le rôle éditeur
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(event) => setIsActive(event.target.checked)}
                        className="w-4 h-4 border-gray-300 rounded"
                      />
                      Compte actif
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  disabled={saving || avatarLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || avatarLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-[#328fce] text-white hover:bg-[#84c19e] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>

            <div className="border-t border-gray-100 pt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Réinitialiser le mot de passe</h2>
              <p className="text-sm text-gray-500 mb-4">
                Définissez un nouveau mot de passe pour cet utilisateur. Il pourra le modifier depuis
                son espace personnel.
              </p>

              {passwordError && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {passwordSuccess}
                </div>
              )}

              <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handlePasswordSubmit}>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <PasswordInput
                    id="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation
                  </label>
                  <PasswordInput
                    id="confirm-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full px-4 py-2 text-sm rounded-lg bg-[#328fce] text-white hover:bg-[#84c19e] transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
                  >
                    {passwordLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {passwordLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


