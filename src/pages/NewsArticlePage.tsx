import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader2, ChevronRight, Home } from 'lucide-react';
import { useNewsArticles, NewsArticle } from '../hooks/useNewsArticles';
import { EditorJSRenderer } from '../components/EditorJSRenderer';
import { NewsCard } from '../components/NewsCard';
import { Link } from '../components/Link';
import { useAuth } from '../contexts/AuthContext';

export function NewsArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();

  const {
    fetchArticleBySlug,
  } = useNewsArticles({ onlyPublished: true, onlyPublishedVisible: true, status: 'published' });
  const relatedArticlesHook = useNewsArticles({
    perPage: 3,
    onlyPublished: true,
    onlyPublishedVisible: true,
    status: 'published',
  });

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadArticle(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadArticle = async (articleSlug: string) => {
    setLoading(true);
    const { success, data } = await fetchArticleBySlug(articleSlug);
    if (!success || !data) {
      navigate('/404');
      return;
    }
    setArticle(data);
    if (data.category_id) {
      relatedArticlesHook.setFilters((prev) => ({
        ...prev,
        categoryId: data.category_id,
        status: 'published',
        onlyPublished: true,
        perPage: 3,
        page: 1,
      }));
    }
    setLoading(false);
  };

  if (loading || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white">
        <div className="container mx-auto px-4 py-16 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement de l’article…
        </div>
      </div>
    );
  }

  const dateLabel = article.published_at
    ? new Date(article.published_at).toLocaleDateString()
    : null;
  const authorName = article.author
    ? [article.author.first_name, article.author.last_name].filter(Boolean).join(' ')
    : '';
  const authorInitials = authorName
    ? authorName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  const categoryColor = article.category?.color ?? '#328fce';
  const gradientBg = `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}99 50%, ${categoryColor}66 100%)`;

  const relatedArticles = relatedArticlesHook.articles.filter((a) => a.id !== article.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
      <div className="container mx-auto px-4 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#328fce] font-medium inline-flex items-center gap-1">
              <Home className="w-4 h-4" />
              Accueil
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/news" className="hover:text-[#328fce] font-medium">
              Actualités
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-800 font-semibold">{article.title}</span>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row">
            <article className="relative bg-white rounded-3xl shadow-lg p-6 md:p-10 space-y-6 w-full lg:w-2/3">
              {(isAdmin || isEditor) && (
                <Link
                  href={`/admin/news/${article.id}/edit`}
                  className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#328fce] bg-white/90 rounded-full border border-[#328fce] hover:bg-[#328fce] hover:text-white transition-colors shadow-sm"
                >
                  Modifier cet article
                </Link>
              )}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{article.title}</h1>
              </div>

              <div className="prose max-w-none">
                <EditorJSRenderer content={article.content} />
              </div>
            </article>

            <aside className="w-full lg:w-1/3">
              <div className="lg:sticky lg:top-24 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                <div
                  className="relative w-full aspect-[1300/720]"
                  style={!article.image_url ? { backgroundImage: gradientBg } : undefined}
                >
                  {article.image_url && (
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {article.category && (
                    <Link
                      href={`/news?category=${article.category.id}`}
                      className="absolute top-3 right-3 inline-flex items-center transition-colors hover:opacity-80"
                    >
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 shadow-sm"
                        style={{ color: article.category.color }}
                      >
                        {article.category.name}
                      </span>
                    </Link>
                  )}
                </div>
                <div className="p-5 space-y-3 text-sm text-gray-700">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {dateLabel && <span className="text-xs text-gray-500">Publié le {dateLabel}</span>}
                    {article.author && (
                      <span className="inline-flex items-center gap-2 text-xs text-gray-700">
                        {article.author.avatar_url ? (
                          <img
                            src={article.author.avatar_url}
                            alt={authorName}
                            className="w-6 h-6 rounded-full object-cover border border-white shadow-sm"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold flex items-center justify-center">
                            {authorInitials || '?'}
                          </span>
                        )}
                        <span>par {authorName}</span>
                      </span>
                    )}
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {relatedArticles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Lire d’autres articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <NewsCard key={related.id} article={related} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
