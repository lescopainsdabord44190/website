import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from './Link';
import { useNewsArticles } from '../hooks/useNewsArticles';
import { NewsCard } from './NewsCard';

export function HomeNewsPreview() {
  const { articles, loading, setFilters } = useNewsArticles({
    perPage: 5,
    status: 'published',
    onlyPublished: true,
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      perPage: 5,
      page: 1,
      status: 'published',
      onlyPublished: true,
    }));
  }, [setFilters]);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#84c19e] font-semibold">Actualités</p>
            <h2 className="text-3xl font-bold text-gray-900">Les dernières nouvelles</h2>
          </div>
          <Link
            href="/news"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#328fce] text-[#328fce] hover:bg-[#328fce] hover:text-white transition-colors"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500">Chargement des articles…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
            <Link
              href="/news"
              className="rounded-2xl bg-gradient-to-br from-[#328fce] to-[#84c19e] text-white p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition"
            >
              <div className="text-sm uppercase tracking-wide"></div>
              <div className="text-2xl font-bold text-center flex flex-col items-center justify-center gap-2">
                <ArrowRight className="w-32 h-32" />Voir toute l'actualité
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-white"></div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
