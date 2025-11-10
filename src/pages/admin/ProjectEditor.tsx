import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, X, Upload, Trash2 } from 'lucide-react';
import { OutputData } from '@editorjs/editorjs';
import { supabase } from '../../lib/supabase';
import { useProjects, type ProjectCounselorLink, type ProjectInput } from '../../hooks/useProjects';
import { useCounselors } from '../../hooks/useCounselors';
import { RichTextEditor } from '../../components/RichTextEditor';

interface ProjectFormState {
  title: string;
  slug: string;
  subtitle: string;
  short_description: string;
  age_group: string;
  cover_image_url: string | null;
  objectivesInput: string;
  content: OutputData | null;
  is_active: boolean;
}

const defaultState: ProjectFormState = {
  title: '',
  slug: '',
  subtitle: '',
  short_description: '',
  age_group: '',
  cover_image_url: null,
  objectivesInput: '',
  content: null,
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

export function ProjectEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { createProject, updateProject } = useProjects({ includeInactive: true });
  const { counselors, loading: counselorsLoading } = useCounselors({ includeInactive: true });

  const [formState, setFormState] = useState<ProjectFormState>(defaultState);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [counselorSelections, setCounselorSelections] = useState<Record<string, { selected: boolean; role: string }>>(
    {}
  );

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select(`
            *,
            project_counselors (
              counselor_id,
              role
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          setFormState({
            title: data.title || '',
            slug: data.slug || '',
            subtitle: data.subtitle || '',
            short_description: data.short_description || '',
            age_group: data.age_group || '',
            cover_image_url: data.cover_image_url,
            objectivesInput: Array.isArray(data.objectives) ? data.objectives.join('\n') : '',
            content:
              data.content && typeof data.content === 'string'
                ? (JSON.parse(data.content) as OutputData)
                : (data.content as OutputData | null),
            is_active: data.is_active ?? true,
          });
          setSlugTouched(true);

          if (Array.isArray(data.project_counselors)) {
            const selections = data.project_counselors.reduce<
              Record<string, { selected: boolean; role: string }>
            >((acc, link) => {
              if (!link.counselor_id) return acc;
              acc[link.counselor_id] = {
                selected: true,
                role: link.role || '',
              };
              return acc;
            }, {});
            setCounselorSelections(selections);
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
        setError('Impossible de charger le projet.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      fetchProject();
    }
  }, [id, isEditMode]);

  const objectives = useMemo(
    () =>
      formState.objectivesInput
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    [formState.objectivesInput]
  );

  const handleChange = (field: keyof ProjectFormState, value: string | boolean | OutputData | null) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTitleChange = (value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, title: value };
      if (!slugTouched) {
        updated.slug = generateSlug(value);
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
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project_images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('project_images').getPublicUrl(filePath);

      handleChange('cover_image_url', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Erreur lors de l’upload de l’image.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    handleChange('cover_image_url', null);
  };

  const toggleCounselorSelection = (counselorId: string) => {
    setCounselorSelections((prev) => {
      const current = prev[counselorId] || { selected: false, role: '' };
      return {
        ...prev,
        [counselorId]: {
          selected: !current.selected,
          role: current.role,
        },
      };
    });
  };

  const updateCounselorRole = (counselorId: string, role: string) => {
    setCounselorSelections((prev) => ({
      ...prev,
      [counselorId]: {
        selected: prev[counselorId]?.selected ?? true,
        role,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formState.title || !formState.slug) {
      setError('Le titre et le slug sont obligatoires.');
      return;
    }

    const selectedLinks: ProjectCounselorLink[] = Object.entries(counselorSelections)
      .filter(([, value]) => value.selected)
      .map(([counselor_id, value]) => ({
        counselor_id,
        role: value.role || null,
      }));

    if (selectedLinks.length === 0) {
      setError('Sélectionnez au moins un·e animateur·rice référent·e.');
      return;
    }

    setSaving(true);

    const payload: ProjectInput = {
      slug: formState.slug,
      title: formState.title,
      subtitle: formState.subtitle || null,
      short_description: formState.short_description || null,
      age_group: formState.age_group || null,
      cover_image_url: formState.cover_image_url,
      objectives,
      content: formState.content,
      is_active: formState.is_active,
    };

    try {
      if (isEditMode && id) {
        const { success, error: updateError } = await updateProject(id, payload, selectedLinks);
        if (!success) {
          throw updateError;
        }
      } else {
        const { success, error: createError } = await createProject(payload, selectedLinks);
        if (!success) {
          throw createError;
        }
      }

      navigate('/admin/projects');
    } catch (error) {
      console.error('Error saving project:', error);
      setError('Erreur lors de la sauvegarde du projet. Merci de réessayer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || counselorsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Modifier un projet' : 'Nouveau projet'}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/projects')}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
              <input
                type="text"
                value={formState.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public / Tranche d’âge</label>
              <input
                type="text"
                value={formState.age_group}
                onChange={(e) => handleChange('age_group', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
            <textarea
              value={formState.short_description}
              onChange={(e) => handleChange('short_description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs (un par ligne)</label>
            <textarea
              value={formState.objectivesInput}
              onChange={(e) => handleChange('objectivesInput', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
              rows={3}
              placeholder="Décrire un objectif par ligne"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contenu détaillé</label>
            <RichTextEditor
              key={id || 'new-project'}
              value={formState.content}
              onChange={(content) => handleChange('content', content)}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
            />
            <span className="text-sm font-medium text-gray-700">Projet actif</span>
          </label>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image de couverture</label>
            {formState.cover_image_url ? (
              <div className="relative">
                <img
                  src={formState.cover_image_url}
                  alt={formState.title}
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
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

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Animateur·rices référent·es *</h3>
            <p className="text-sm text-gray-600">
              Sélectionnez au moins une personne référente pour le projet. Vous pouvez préciser son rôle.
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {counselors.map((counselor) => {
                const selection = counselorSelections[counselor.id] || { selected: false, role: '' };
                return (
                  <div
                    key={counselor.id}
                    className={`border rounded-xl p-3 transition-colors ${
                      selection.selected ? 'border-[#328fce] bg-blue-50/50' : 'border-gray-200'
                    }`}
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selection.selected}
                        onChange={() => toggleCounselorSelection(counselor.id)}
                        className="mt-1 w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {counselor.first_name} {counselor.last_name || ''}
                          </span>
                          {!counselor.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              Inactif·ve
                            </span>
                          )}
                        </div>
                        {selection.selected && (
                          <input
                            type="text"
                            value={selection.role}
                            onChange={(e) => updateCounselorRole(counselor.id, e.target.value)}
                            placeholder="Préciser le rôle (facultatif)"
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none text-sm"
                          />
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}


