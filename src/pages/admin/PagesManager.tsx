import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { buildFullPath, type Page as PageType } from '../../hooks/usePages';
import { DeletePageDialog } from '../../components/DeletePageDialog';

interface Page extends PageType {
  level?: number;
}

export function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizePages = () => {
    const buildHierarchy = (parentId: string | null = null, level: number = 0): Page[] => {
      const children = pages.filter(page => page.parent_id === parentId);
      const result: Page[] = [];
      
      children.forEach(child => {
        result.push({ ...child, level });
        result.push(...buildHierarchy(child.id, level + 1));
      });
      
      return result;
    };
    
    return buildHierarchy(null, 0);
  };

  const getAllDescendants = (pageId: string): string[] => {
    const descendants: string[] = [];
    const directChildren = pages.filter(p => p.parent_id === pageId);
    
    directChildren.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getAllDescendants(child.id));
    });
    
    return descendants;
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

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  const deletePageOnly = async () => {
    if (!pageToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update({ parent_id: null })
        .eq('parent_id', pageToDelete.id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageToDelete.id);

      if (deleteError) throw deleteError;
      
      await fetchPages();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting page:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deletePageWithDescendants = async () => {
    if (!pageToDelete) return;
    
    setIsDeleting(true);
    try {
      const descendantIds = getAllDescendants(pageToDelete.id);
      const allIdsToDelete = [pageToDelete.id, ...descendantIds];

      const { error } = await supabase
        .from('pages')
        .delete()
        .in('id', allIdsToDelete);

      if (error) throw error;
      
      await fetchPages();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting pages:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des pages</h2>
        <button
          onClick={() => navigate('/admin/pages/new')}
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
          {organizePages().map((page) => (
            <div
              key={page.id}
              className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                page.level && page.level > 0 ? 'border-l-4 border-[#328fce]' : ''
              }`}
              style={page.level && page.level > 0 ? { marginLeft: `${page.level * 2}rem` } : undefined}
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
                      Cachée du menu principal
                    </span>
                  )}
                  {page.show_in_footer && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Menu footer
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() => togglePageStatus(page.id, page.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      page.is_active ? 'bg-[#328fce]' : 'bg-gray-300'
                    }`}
                    title={page.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        page.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                <a
                  href={buildFullPath(page.id, pages)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-[#328fce] transition-colors"
                  title="Voir la page"
                >
                  <Eye className="w-5 h-5" />
                </a>
                <button
                  onClick={() => navigate(`/admin/pages/${page.id}/edit`)}
                  className="p-2 text-gray-600 hover:text-[#328fce] transition-colors"
                  title="Modifier"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openDeleteDialog(page)}
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

      <DeletePageDialog
        isOpen={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onDeleteOnly={deletePageOnly}
        onDeleteWithDescendants={deletePageWithDescendants}
        pageTitle={pageToDelete?.title || ''}
        hasDescendants={pageToDelete ? getAllDescendants(pageToDelete.id).length > 0 : false}
        descendantsCount={pageToDelete ? getAllDescendants(pageToDelete.id).length : 0}
        isLoading={isDeleting}
      />
    </div>
  );
}
