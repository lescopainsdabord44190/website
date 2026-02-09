import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useNewsArticles, NewsStatus } from '../../hooks/useNewsArticles';
import { useNewsCategories } from '../../hooks/useNewsCategories';
import { useNewsTags } from '../../hooks/useNewsTags';
import { Loader2, Plus, Search, Trash2, Edit } from 'lucide-react';

const STATUS_LABELS: Record<NewsStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
};

export function NewsManager() {
  const navigate = useNavigate();
  const {
    categories: categories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,
  } = useNewsCategories();
  const {
    tags,
    createTag,
    updateTag,
    deleteTag,
    fetchTags,
  } = useNewsTags();
  const {
    articles,
    loading,
    pagination,
    setFilters,
    deleteArticle,
  } = useNewsArticles({ perPage: 10, status: 'all' });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | NewsStatus>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);
  const perPageMeta = 10;
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#328fce' });
  const [tagForm, setTagForm] = useState({ name: '', slug: '' });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search,
      status,
      categoryId,
      page,
      perPage: 10,
    }));
  }, [search, status, categoryId, page, setFilters]);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((pagination.total || 0) / pagination.perPage));
  }, [pagination.total, pagination.perPage]);

  const categorySlice = useMemo(() => {
    const start = (catPage - 1) * perPageMeta;
    return categories.slice(start, start + perPageMeta);
  }, [categories, catPage]);

  const tagSlice = useMemo(() => {
    const start = (tagPage - 1) * perPageMeta;
    return tags.slice(start, start + perPageMeta);
  }, [tags, tagPage]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Supprimer cet article ?');
    if (!confirmed) return;
    await deleteArticle(id);
  };

  const handleSaveCategory = async () => {
    if (editingCategoryId) {
      await updateCategory(editingCategoryId, categoryForm);
    } else {
      await createCategory(categoryForm);
    }
    setCategoryForm({ name: '', color: '#328fce' });
    setEditingCategoryId(null);
  };

  const handleEditCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setEditingCategoryId(id);
    setCategoryForm({ name: cat.name, color: cat.color });
  };

  const handleSaveTag = async () => {
    if (editingTagId) {
      await updateTag(editingTagId, tagForm);
    } else {
      await createTag(tagForm.name);
    }
    setTagForm({ name: '', slug: '' });
    setEditingTagId(null);
  };

  const handleEditTag = (id: string) => {
    const t = tags.find((tag) => tag.id === id);
    if (!t) return;
    setEditingTagId(id);
    setTagForm({ name: t.name, slug: t.slug });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Actualités</h2>
          <p className="text-gray-600">Gérez les articles, statuts et filtres</p>
        </div>
        <Link
          to="/admin/news/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-full hover:bg-[#84c19e] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 px-3 py-2 border rounded-full">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un titre…"
              className="w-full outline-none"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className="px-3 py-2 border rounded-full"
            value={categoryId ?? ''}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value || null);
            }}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded-full"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as 'all' | NewsStatus);
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
          <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
            <span>
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded-full disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Précédent
              </button>
              <button
                className="px-3 py-1 border rounded-full disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading && (
            <div className="py-10 flex items-center justify-center text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Chargement des articles…
            </div>
          )}

          {!loading && articles.length === 0 && (
            <div className="py-10 text-center text-gray-500">Aucun article trouvé</div>
          )}

          {articles.map((article) => (
            <div
              key={article.id}
              className="py-4 px-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">{article.title}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {STATUS_LABELS[article.status]}
                  </span>
                  {article.category && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                      style={{ backgroundColor: `${article.category.color}22`, color: article.category.color }}
                    >
                      {article.category.name}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span>Slug : {article.slug}</span>
                  {article.published_at && article.status === 'published' && (
                    <span>• Publié le {new Date(article.published_at).toLocaleDateString()}</span>
                  )}
                  {!article.published_at && article.status === 'published' && (
                    <span>• À publier : date non définie</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 text-sm border rounded-full hover:bg-gray-50"
                  onClick={() => navigate(`/admin/news/${article.id}/edit`)}
                >
                  Éditer
                </button>
                <Link
                  to={`/news/${article.slug}`}
                  className="px-3 py-2 text-sm border rounded-full hover:bg-gray-50"
                >
                  Voir
                </Link>
                <button
                  className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50"
                  onClick={() => handleDelete(article.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catégories */}
      <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">Catégories</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="px-3 py-2 border rounded-lg"
              placeholder="Nom"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="color"
              className="w-12 h-10 rounded cursor-pointer border"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))}
            />
            <button
              onClick={handleSaveCategory}
              className="px-3 py-2 bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e]"
            >
              {editingCategoryId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingCategoryId && (
              <button
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryForm({ name: '', color: '#328fce' });
                }}
                className="px-3 py-2 border rounded-lg"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {categorySlice.map((cat) => (
            <div
              key={cat.id}
              className="py-3 flex items-center justify-between rounded-xl px-3 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: cat.color, borderColor: cat.color }}
                />
                <div>
                  <p className="font-medium text-gray-800">{cat.name}</p>
                  <p className="text-xs text-gray-500">Couleur : {cat.color}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-sm border rounded-full hover:bg-gray-50 inline-flex items-center gap-1"
                  onClick={() => handleEditCategory(cat.id)}
                >
                  <Edit className="w-4 h-4" />
                  Éditer
                </button>
                <button
                  className="px-2 py-1 text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 inline-flex items-center gap-1"
                  onClick={() => deleteCategory(cat.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
          <button
            className="px-3 py-1 border rounded-full disabled:opacity-50"
            onClick={() => setCatPage((p) => Math.max(1, p - 1))}
            disabled={catPage <= 1}
          >
            Précédent
          </button>
          <span>
            Page {catPage} / {Math.max(1, Math.ceil(categories.length / perPageMeta))}
          </span>
          <button
            className="px-3 py-1 border rounded-full disabled:opacity-50"
            onClick={() => setCatPage((p) => Math.min(Math.max(1, Math.ceil(categories.length / perPageMeta)), p + 1))}
            disabled={catPage >= Math.max(1, Math.ceil(categories.length / perPageMeta))}
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">Tags</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="px-3 py-2 border rounded-lg"
              placeholder="Nom"
              value={tagForm.name}
              onChange={(e) => setTagForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <button
              onClick={handleSaveTag}
              className="px-3 py-2 bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e]"
            >
              {editingTagId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingTagId && (
              <button
                onClick={() => {
                  setEditingTagId(null);
                  setTagForm({ name: '', slug: '' });
                }}
                className="px-3 py-2 border rounded-lg"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {tagSlice.map((tag) => (
            <div
              key={tag.id}
              className="py-3 flex items-center justify-between rounded-xl px-3 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow"
            >
              <div>
                <p className="font-medium text-gray-800">{tag.name}</p>
                <p className="text-xs text-gray-500">Slug : {tag.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-sm border rounded-full hover:bg-gray-50 inline-flex items-center gap-1"
                  onClick={() => handleEditTag(tag.id)}
                >
                  <Edit className="w-4 h-4" />
                  Éditer
                </button>
                <button
                  className="px-2 py-1 text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 inline-flex items-center gap-1"
                  onClick={() => deleteTag(tag.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
          <button
            className="px-3 py-1 border rounded-full disabled:opacity-50"
            onClick={() => setTagPage((p) => Math.max(1, p - 1))}
            disabled={tagPage <= 1}
          >
            Précédent
          </button>
          <span>
            Page {tagPage} / {Math.max(1, Math.ceil(tags.length / perPageMeta))}
          </span>
          <button
            className="px-3 py-1 border rounded-full disabled:opacity-50"
            onClick={() => setTagPage((p) => Math.min(Math.max(1, Math.ceil(tags.length / perPageMeta)), p + 1))}
            disabled={tagPage >= Math.max(1, Math.ceil(tags.length / perPageMeta))}
          >
            Suivant
          </button>
        </div>
      </div>

    </div>
  );
}
