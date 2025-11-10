import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Loader2, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVolunteers, type VolunteerCommissionLink, type VolunteerInput } from '../../hooks/useVolunteers';
import { useCommissions } from '../../hooks/useCommissions';

interface VolunteerFormState {
  slug: string;
  first_name: string;
  last_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  is_executive_member: boolean;
  is_board_member: boolean;
  mandate_start_date: string;
  is_active: boolean;
}

const defaultState: VolunteerFormState = {
  slug: '',
  first_name: '',
  last_name: '',
  role_title: '',
  bio: '',
  photo_url: null,
  is_executive_member: false,
  is_board_member: false,
  mandate_start_date: '',
  is_active: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toDateInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export function VolunteerEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const {
    volunteers,
    loading: volunteersLoading,
    createVolunteer,
    updateVolunteer,
  } = useVolunteers({ includeInactive: true });
  const { commissions, loading: commissionsLoading } = useCommissions({ includeInactive: true });

  const [formState, setFormState] = useState<VolunteerFormState>(defaultState);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  const volunteer = useMemo(
    () => (isEditing ? volunteers.find((item) => item.id === id) : null),
    [isEditing, volunteers, id]
  );

  useEffect(() => {
    if (volunteer) {
      setFormState({
        slug: volunteer.slug,
        first_name: volunteer.first_name,
        last_name: volunteer.last_name ?? '',
        role_title: volunteer.role_title ?? '',
        bio: volunteer.bio ?? '',
        photo_url: volunteer.photo_url ?? null,
        is_executive_member: volunteer.is_executive_member,
        is_board_member: volunteer.is_board_member,
        mandate_start_date: toDateInputValue(volunteer.mandate_start_date),
        is_active: volunteer.is_active,
      });
      setSelectedCommissions(
        volunteer.commissions
          .map((link) => link.commission?.id)
          .filter((idValue): idValue is string => Boolean(idValue))
      );
      setSlugTouched(true);
    } else if (!isEditing) {
      setFormState(defaultState);
      setSelectedCommissions([]);
      setSlugTouched(false);
    }
  }, [volunteer, isEditing]);

  const handleChange = <Key extends keyof VolunteerFormState>(key: Key, value: VolunteerFormState[Key]) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value };

      if (!slugTouched && (key === 'first_name' || key === 'last_name')) {
        const composite = `${next.first_name} ${next.last_name}`.trim();
        if (composite) {
          next.slug = slugify(composite);
        }
      }

      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setFormState((prev) => ({ ...prev, slug: slugify(value) }));
  };

  const toggleCommission = (commissionId: string) => {
    setSelectedCommissions((prev) =>
      prev.includes(commissionId) ? prev.filter((idValue) => idValue !== commissionId) : [...prev, commissionId]
    );
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide (PNG, JPG, WEBP).');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const extension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
      const filePath = `photos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('volunteer_photos').upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('volunteer_photos').getPublicUrl(filePath);

      setFormState((prev) => ({ ...prev, photo_url: publicUrl }));
    } catch (uploadErr) {
      console.error('Error uploading volunteer photo:', uploadErr);
      setError("Une erreur est survenue lors de l'upload de la photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormState((prev) => ({ ...prev, photo_url: null }));
  };

  const isReady =
    formState.slug.trim().length > 0 && formState.first_name.trim().length > 0 && !saving && !volunteersLoading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady) return;

    setSaving(true);
    setError(null);

    const payload: VolunteerInput = {
      slug: formState.slug.trim(),
      first_name: formState.first_name.trim(),
      last_name: formState.last_name.trim() || null,
      role_title: formState.role_title.trim() || null,
      bio: formState.bio.trim() || null,
      photo_url: formState.photo_url,
      is_executive_member: formState.is_executive_member,
      is_board_member: formState.is_board_member,
      mandate_start_date: formState.mandate_start_date || null,
      is_active: formState.is_active,
    };

    const commissionLinks: VolunteerCommissionLink[] = selectedCommissions.map((commission_id) => ({
      commission_id,
    }));

    try {
      if (isEditing && volunteer) {
        const result = await updateVolunteer(volunteer.id, payload, commissionLinks);
        if (!result.success) {
          throw new Error('La mise à jour a échoué.');
        }
      } else {
        const result = await createVolunteer(payload, commissionLinks);
        if (!result.success) {
          throw new Error('La création a échoué.');
        }
      }

      navigate('/admin/volunteers');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement du bénévole."
      );
    } finally {
      setSaving(false);
    }
  };

  if (volunteersLoading && isEditing && !volunteer) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
      </div>
    );
  }

  if (isEditing && !volunteersLoading && !volunteer) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/admin/volunteers')}
          className="inline-flex items-center gap-2 text-sm text-[#328fce] hover:text-[#84c19e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Bénévole introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/volunteers')}
          className="inline-flex items-center gap-2 text-sm text-[#328fce] hover:text-[#84c19e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Modifier le bénévole' : 'Nouveau bénévole'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
        <section className="bg-white rounded-2xl shadow p-6 space-y-4 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Informations principales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formState.first_name}
                onChange={(event) => handleChange('first_name', event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formState.last_name}
                onChange={(event) => handleChange('last_name', event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              value={formState.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Identifiant unique utilisé pour l’URL.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle dans l’association</label>
            <input
              type="text"
              value={formState.role_title}
              onChange={(event) => handleChange('role_title', event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              placeholder="Président·e, Trésorier·e, ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biographie (optionnel)</label>
            <textarea
              value={formState.bio}
              onChange={(event) => handleChange('bio', event.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
            />
          </div>

        </section>

        <div className="space-y-4">
          <section className="bg-white rounded-2xl shadow p-6 space-y-4 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Statut & mandats</h3>

            <div className="space-y-3">
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formState.is_executive_member}
                  onChange={(event) => handleChange('is_executive_member', event.target.checked)}
                  className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
                />
                <span className="text-sm text-gray-700">Membre du bureau</span>
              </label>
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formState.is_board_member}
                  onChange={(event) => handleChange('is_board_member', event.target.checked)}
                  className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
                />
                <span className="text-sm text-gray-700">Membre du conseil d'administration</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début de mandat</label>
              <input
                type="date"
                value={formState.mandate_start_date}
                onChange={(event) => handleChange('mandate_start_date', event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="volunteer_is_active"
                checked={formState.is_active}
                onChange={(event) => handleChange('is_active', event.target.checked)}
                className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
              />
              <label htmlFor="volunteer_is_active" className="text-sm font-medium text-gray-700">
                Bénévole actif·ve
              </label>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Commissions</h4>
              {commissionsLoading ? (
                <div className="text-sm text-gray-500">Chargement des commissions...</div>
              ) : commissions.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune commission disponible.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {commissions.map((commission) => (
                    <label key={commission.id} className="flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedCommissions.includes(commission.id)}
                        onChange={() => toggleCommission(commission.id)}
                        className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
                      />
                      <span>
                        {commission.title}
                        {!commission.is_active && <span className="text-xs text-gray-400 ml-2">(inactive)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 space-y-4 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Photo de profil</h3>
            {formState.photo_url ? (
              <div className="relative w-full">
                <img
                  src={formState.photo_url}
                  alt={`${formState.first_name} ${formState.last_name}`}
                  className="w-full h-56 object-cover rounded-lg shadow-md"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Cliquez pour uploader</span>
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
            {uploading && <p className="text-sm text-gray-500">Upload en cours...</p>}
            {!formState.photo_url && !uploading && (
              <p className="text-xs text-gray-500">
                Téléversez une photo pour l’affichage public du bénévole (stockée dans le bucket Supabase).
              </p>
            )}
          </section>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!isReady}
          className="flex items-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50 font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Enregistrer
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/volunteers')}
          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          disabled={saving}
        >
          Annuler
        </button>
      </div>

    </form>
  );
}


