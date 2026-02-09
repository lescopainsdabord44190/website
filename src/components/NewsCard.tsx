import { Link } from 'react-router';
import { NewsArticle } from '../hooks/useNewsArticles';

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  const dateLabel = article.published_at
    ? new Date(article.published_at).toLocaleDateString()
    : null;

  const categoryColor = article.category?.color ?? '#328fce';
  const gradientBg = `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}99 50%, ${categoryColor}66 100%)`;

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden flex flex-col"
    >
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0"
          style={
            article.image_url
              ? undefined
              : {
                  backgroundImage: gradientBg,
                }
          }
        />
        {article.image_url && (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        )}
        <div className="absolute inset-0 bg-black/25" />
        {article.category && (
          <span
            className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-white/90 text-gray-800 shadow"
            style={{ color: article.category.color }}
          >
            {article.category.name}
          </span>
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="p-4 text-white space-y-1 drop-shadow-lg">
            {dateLabel && <p className="text-xs text-white/80">{dateLabel}</p>}
            <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        {article.summary && <p className="text-sm text-gray-600 line-clamp-3">{article.summary}</p>}
        <div className="mt-auto text-sm font-medium text-[#328fce]">Lire l’article →</div>
      </div>
    </Link>
  );
}
