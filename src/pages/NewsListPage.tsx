import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Loader2, Search, ChevronRight, Plus } from 'lucide-react';
import { useNewsArticles } from '../hooks/useNewsArticles';
import { useNewsCategories } from '../hooks/useNewsCategories';
import { NewsCard } from '../components/NewsCard';
import { Link } from '../components/Link';
import { useAuth } from '../contexts/AuthContext';

export function NewsListPage() {
  const location = useLocation();
  const { articles, loading, pagination, setFilters } = useNewsArticles({
    perPage: 9,
    status: 'published',
    onlyPublished: true,
    onlyPublishedVisible: true,
  });
  const { categories } = useNewsCategories();
  const { isAdmin, isEditor } = useAuth();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category) {
      setCategoryId(category);
      setPage(1);
    }
  }, [location.search]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search,
      categoryId,
      status: 'published',
      onlyPublished: true,
      onlyPublishedVisible: true,
      perPage: 9,
      page,
    }));
  }, [search, categoryId, page, setFilters]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / pagination.perPage)),
    [pagination.total, pagination.perPage]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
      <div className="container mx-auto px-4 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-[#328fce] font-medium">
            Accueil
          </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-800 font-semibold">Actualités</span>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">Actualités</h1>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-full bg-white">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un article…"
                      className="w-full outline-none"
                      value={search}
                      onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                      }}
                    />
                  </div>
                  {(isAdmin || isEditor) && (
                    <Link
                      href="/admin/news/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-full hover:bg-[#84c19e] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvel article
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {loading && (
                    <div className="col-span-full flex items-center justify-center text-gray-500 gap-2 py-10">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Chargement des articles…
                    </div>
                  )}

                  {!loading && articles.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-10">
                      Aucun article trouvé.
                    </div>
                  )}

                  {articles.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                      Page {page} / {totalPages} ({pagination.total} articles)
                    </div>
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
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Catégories</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setCategoryId(null);
                      }}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition ${
                        categoryId === null
                          ? 'bg-[#328fce]/10 border-[#328fce]/30 text-[#328fce]'
                          : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Toutes
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const selected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border transition ${
                            selected
                              ? 'bg-white shadow-sm'
                              : 'bg-gray-50 hover:bg-white'
                          }`}
                          style={{
                            borderColor: selected ? `${cat.color}55` : '#e5e7eb',
                            color: selected ? cat.color : '#374151',
                          }}
                          onClick={() => {
                            setPage(1);
                            setCategoryId(cat.id);
                          }}
                        >
                          <span
                            className="inline-flex w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
