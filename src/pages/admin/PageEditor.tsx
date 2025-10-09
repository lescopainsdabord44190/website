import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useAuth } from '../../contexts/AuthContext';

interface PageEditorProps {
  page: any | null;
  onSave: () => void;
  onCancel: () => void;
}

export function PageEditor({ page, onSave, onCancel }: PageEditorProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    meta_description: '',
    content: [] as any[],
    parent_id: null as string | null,
    order_index: 0,
    is_active: true,
    show_in_menu: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parentPages, setParentPages] = useState<any[]>([]);

  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title || '',
        slug: page.slug || '',
        meta_description: page.meta_description || '',
        content: page.content || [],
        parent_id: page.parent_id || null,
        order_index: page.order_index || 0,
        is_active: page.is_active ?? true,
        show_in_menu: page.show_in_menu ?? true,
      });
    }
    fetchParentPages();
  }, [page]);

  const fetchParentPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug')
        .is('parent_id', null)
        .order('order_index');

      if (error) throw error;
      setParentPages(data || []);
    } catch (error) {
      console.error('Error fetching parent pages:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData({ ...formData, title });
    if (!page) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(title) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
        ...(page ? {} : { created_by: user?.id }),
      };

      if (page) {
        const { error } = await supabase
          .from('pages')
          .update(dataToSave)
          .eq('id', page.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pages')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving page:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {page ? 'Modifier la page' : 'Nouvelle page'}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre de la page *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
            placeholder="Titre de la page"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) *
          </label>
          <input
            type="text"
            id="slug"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
            placeholder="url-de-la-page"
          />
        </div>
      </div>

      <div>
        <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Description (SEO)
        </label>
        <textarea
          id="meta_description"
          value={formData.meta_description}
          onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
          rows={2}
          placeholder="Description pour les moteurs de recherche"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-1">
            Page parente
          </label>
          <select
            id="parent_id"
            value={formData.parent_id || ''}
            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
          >
            <option value="">Aucune (page racine)</option>
            {parentPages
              .filter((p) => p.id !== page?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="order_index" className="block text-sm font-medium text-gray-700 mb-1">
            Ordre
          </label>
          <input
            type="number"
            id="order_index"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
            />
            <span className="text-sm font-medium text-gray-700">Page active</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.show_in_menu}
              onChange={(e) => setFormData({ ...formData, show_in_menu: e.target.checked })}
              className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
            />
            <span className="text-sm font-medium text-gray-700">Afficher dans le menu</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Contenu de la page
        </label>
        <RichTextEditor
          value={formData.content}
          onChange={(content) => setFormData({ ...formData, content })}
        />
      </div>
    </form>
  );
}
