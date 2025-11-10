import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, X, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCounselors, type CounselorInput } from '../../hooks/useCounselors';

interface CounselorFormState {
  slug: string;
  first_name: string;
  last_name: string;
  role_title: string;
  tagline: string;
  bio: string;
  focusAreasInput: string;
  photo_url: string | null;
  is_active: boolean;
}

const defaultState: CounselorFormState = {
  slug: '',
  first_name: '',
  last_name: '',
  role_title: '',
  tagline: '',
  bio: '',
  focusAreasInput: '',
  photo_url: null,
  is_active: true,
};

function generateSlug(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CounselorEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { createCounselor, updateCounselor } = useCounselors({ includeInactive: true });

  const [formState, setFormState] = useState<CounselorFormState>(defaultState);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    const fetchCounselor = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('counselors')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          setFormState({
            slug: data.slug || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            role_title: data.role_title || '',
            tagline: data.tagline || '',
            bio: data.bio || '',
            focusAreasInput: Array.isArray(data.focus_areas) ? data.focus_areas.join(', ') : '',
            photo_url: data.photo_url,
            is_active: data.is_active ?? true,
          });
          setSlugTouched(true);
        }
      } catch (error) {
        console.error('Error loading counselor:', error);
        setError('Impossible de charger la fiche animateur.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      fetchCounselor();
    }
  }, [id, isEditMode]);

  const focusAreas = useMemo(
    () =>
      formState.focusAreasInput
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    [formState.focusAreasInput]
  );

  const handleChange = (field: keyof CounselorFormState, value: string | boolean | null) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNameChange = (field: 'first_name' | 'last_name', value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, [field]: value };

      if (!slugTouched) {
        const slugSource = `${field === 'first_name' ? value : updated.first_name} ${
          field === 'last_name' ? value : updated.last_name
        }`;
        updated.slug = generateSlug(slugSource.trim());
      }

      return updated;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    handleChange('slug', generateSlug(value));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const extension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
      const filePath = `photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('counselor_photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('counselor_photos').getPublicUrl(filePath);

      handleChange('photo_url', publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Erreur lors de l’upload de la photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    handleChange('photo_url', null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formState.slug || !formState.first_name) {
      setError('Le prénom et le slug sont obligatoires.');
      return;
    }

    setSaving(true);

    const payload: CounselorInput = {
      slug: formState.slug,
      first_name: formState.first_name,
      last_name: formState.last_name || null,
      role_title: formState.role_title || null,
      tagline: formState.tagline || null,
      bio: formState.bio || null,
      photo_url: formState.photo_url,
      focus_areas: focusAreas,
      is_active: formState.is_active,
    };

    try {
      if (isEditMode && id) {
        const { success, error: updateError } = await updateCounselor(id, payload);
        if (!success) {
          throw updateError;
        }
      } else {
        const { success, error: createError } = await createCounselor(payload);
        if (!success) {
          throw createError;
        }
      }

      navigate('/admin/anims');
    } catch (error) {
      console.error('Error saving counselor:', error);
      setError('Erreur lors de la sauvegarde. Merci de réessayer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Modifier un animateur' : 'Nouvel animateur'}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/anims')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5" />
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formState.first_name}
                onChange={(e) => handleNameChange('first_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formState.last_name}
                onChange={(e) => handleNameChange('last_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                type="text"
                value={formState.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre / Fonction</label>
              <input
                type="text"
                value={formState.role_title}
                onChange={(e) => handleChange('role_title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accroche</label>
            <input
              type="text"
              value={formState.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biographie</label>
            <textarea
              value={formState.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domaines d’expertise</label>
            <input
              type="text"
              value={formState.focusAreasInput}
              onChange={(e) => handleChange('focusAreasInput', e.target.value)}
              placeholder="Séparez les domaines par des virgules"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
            />
            {focusAreas.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Aperçu : {focusAreas.map((area) => `#${area}`).join(' ')}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
            />
            <span className="text-sm font-medium text-gray-700">Animateur·rice actif·ve</span>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo de profil</label>
            {formState.photo_url ? (
              <div className="relative">
                <img
                  src={formState.photo_url}
                  alt={`${formState.first_name} ${formState.last_name}`}
                  className="w-full h-48 object-cover rounded-lg shadow-md"
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
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
            {uploading && <p className="mt-2 text-sm text-gray-500">Upload en cours...</p>}
          </div>
        </div>
      </div>
    </form>
  );
}


