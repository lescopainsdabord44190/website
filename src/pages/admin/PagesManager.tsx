import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageEditor } from './PageEditor';

interface Page {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  show_in_menu: boolean;
  order_index: number;
  parent_id: string | null;
}

export function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, is_active, show_in_menu, order_index, parent_id')
        .order('order_index');

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_active: !currentStatus })
        .eq('id', pageId);

      if (error) throw error;
      fetchPages();
    } catch (error) {
      console.error('Error toggling page status:', error);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette page ?')) return;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  const handleSaveComplete = () => {
    setEditingPage(null);
    setCreatingNew(false);
    fetchPages();
  };

  if (editingPage || creatingNew) {
    return (
      <PageEditor
        page={editingPage}
        onSave={handleSaveComplete}
        onCancel={() => {
          setEditingPage(null);
          setCreatingNew(false);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des pages</h2>
        <button
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle page
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Aucune page créée pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-800">{page.title}</h3>
                  <span className="text-sm text-gray-500">/{page.slug}</span>
                  {!page.is_active && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Désactivée
                    </span>
                  )}
                  {!page.show_in_menu && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Cachée du menu
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePageStatus(page.id, page.is_active)}
                  className="p-2 text-gray-600 hover:text-[#328fce] transition-colors"
                  title={page.is_active ? 'Désactiver' : 'Activer'}
                >
                  {page.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setEditingPage(page)}
                  className="p-2 text-gray-600 hover:text-[#328fce] transition-colors"
                  title="Modifier"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deletePage(page.id)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
