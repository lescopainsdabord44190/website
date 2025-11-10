import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import {
  useCommissions,
  type CommissionInput,
  type CommissionVolunteerLink,
} from '../../hooks/useCommissions';
import { useVolunteers } from '../../hooks/useVolunteers';

interface CommissionFormState {
  slug: string;
  title: string;
  description: string;
  is_active: boolean;
}

const defaultState: CommissionFormState = {
  slug: '',
  title: '',
  description: '',
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

export function CommissionEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const {
    commissions,
    loading: commissionsLoading,
    createCommission,
    updateCommission,
  } = useCommissions({ includeInactive: true });
  const { volunteers, loading: volunteersLoading } = useVolunteers({ includeInactive: true });

  const [formState, setFormState] = useState<CommissionFormState>(defaultState);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const commission = useMemo(
    () => (isEditing ? commissions.find((item) => item.id === id) : null),
    [isEditing, commissions, id]
  );

  useEffect(() => {
    if (commission) {
      setFormState({
        slug: commission.slug,
        title: commission.title,
        description: commission.description ?? '',
        is_active: commission.is_active,
      });
      setSelectedVolunteers(
        commission.volunteers
          .map((link) => link.volunteer?.id)
          .filter((identifier): identifier is string => Boolean(identifier))
      );
      setSlugTouched(true);
    } else if (!isEditing) {
      setFormState(defaultState);
      setSelectedVolunteers([]);
      setSlugTouched(false);
    }
  }, [commission, isEditing]);

  const handleChange = <Key extends keyof CommissionFormState>(key: Key, value: CommissionFormState[Key]) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value };

      if (!slugTouched && key === 'title') {
        if (next.title) {
          next.slug = slugify(next.title);
        }
      }

      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setFormState((prev) => ({ ...prev, slug: slugify(value) }));
  };

  const toggleVolunteer = (volunteerId: string) => {
    setSelectedVolunteers((prev) =>
      prev.includes(volunteerId) ? prev.filter((idValue) => idValue !== volunteerId) : [...prev, volunteerId]
    );
  };

  const isReady =
    formState.slug.trim().length > 0 && formState.title.trim().length > 0 && !saving && !commissionsLoading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady) return;

    setSaving(true);
    setError(null);

    const payload: CommissionInput = {
      slug: formState.slug.trim(),
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      is_active: formState.is_active,
    };

    const volunteerLinks: CommissionVolunteerLink[] = selectedVolunteers.map((volunteer_id) => ({
      volunteer_id,
    }));

    try {
      if (isEditing && commission) {
        const result = await updateCommission(commission.id, payload, volunteerLinks);
        if (!result.success) {
          throw new Error('La mise à jour a échoué.');
        }
      } else {
        const result = await createCommission(payload, volunteerLinks);
        if (!result.success) {
          throw new Error('La création a échoué.');
        }
      }

      navigate('/admin/commissions');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement de la commission."
      );
    } finally {
      setSaving(false);
    }
  };

  if (commissionsLoading && isEditing && !commission) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
      </div>
    );
  }

  if (isEditing && !commissionsLoading && !commission) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/admin/commissions')}
          className="inline-flex items-center gap-2 text-sm text-[#328fce] hover:text-[#84c19e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Commission introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/commissions')}
          className="inline-flex items-center gap-2 text-sm text-[#328fce] hover:text-[#84c19e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Modifier la commission' : 'Nouvelle commission'}
        </h2>
      </div>

      <section className="bg-white rounded-2xl shadow p-6 space-y-4 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Informations générales</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={formState.title}
              onChange={(event) => handleChange('title', event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              required
            />
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formState.description}
            onChange={(event) => handleChange('description', event.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
            placeholder="Résumé des objectifs et missions de la commission"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="commission_is_active"
            checked={formState.is_active}
            onChange={(event) => handleChange('is_active', event.target.checked)}
            className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
          />
          <label htmlFor="commission_is_active" className="text-sm font-medium text-gray-700">
            Commission active
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 space-y-3 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Bénévoles associés</h3>
        {volunteersLoading ? (
          <div className="text-sm text-gray-500">Chargement des bénévoles...</div>
        ) : volunteers.length === 0 ? (
          <div className="text-sm text-gray-500">Aucun bénévole disponible.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {volunteers.map((volunteer) => (
              <label key={volunteer.id} className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedVolunteers.includes(volunteer.id)}
                  onChange={() => toggleVolunteer(volunteer.id)}
                  className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
                />
                <span>
                  {volunteer.first_name} {volunteer.last_name || ''}
                  {!volunteer.is_active && <span className="text-xs text-gray-400 ml-2">(inactif)</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

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
          onClick={() => navigate('/admin/commissions')}
          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          disabled={saving}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}


