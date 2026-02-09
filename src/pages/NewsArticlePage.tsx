import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader2, Tag, ChevronRight, Home } from 'lucide-react';
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

  const relatedArticles = relatedArticlesHook.articles.filter((a) => a.id !== article.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
      <div className="container mx-auto px-4 space-y-8">
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

        <article className="relative bg-white rounded-3xl shadow-lg p-6 md:p-10 space-y-6">
          {article.image_url && (
            <div className="relative -mx-6 -mt-6 md:-mx-10 md:-mt-10 h-72 md:h-96 overflow-hidden rounded-t-3xl">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              {(isAdmin || isEditor) && (
                <Link
                  href={`/admin/news/${article.id}/edit`}
                  className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#328fce] bg-white/90 rounded-full border border-[#328fce] hover:bg-[#328fce] hover:text-white transition-colors shadow-sm"
                >
                  Modifier cet article
                </Link>
              )}
            </div>
          )}
          {(!article.image_url && (isAdmin || isEditor)) && (
            <Link
              href={`/admin/news/${article.id}/edit`}
              className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#328fce] bg-white/90 rounded-full border border-[#328fce] hover:bg-[#328fce] hover:text-white transition-colors shadow-sm"
            >
              Modifier cet article
            </Link>
          )}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {article.category && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full"
                style={{ backgroundColor: `${article.category.color}22`, color: article.category.color }}
              >
                <Tag className="w-3 h-3" />
                {article.category.name}
              </span>
            )}
            {dateLabel && <span>Publié le {dateLabel}</span>}
            {article.author && (
              <span>
                • Auteur : {[article.author.first_name, article.author.last_name].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{article.title}</h1>
        </div>

        <div className="prose max-w-none">
          <EditorJSRenderer content={article.content} />
        </div>
        </article>

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
  );
}
