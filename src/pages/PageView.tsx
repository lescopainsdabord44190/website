import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router';
import { usePageBySlug, usePages } from '../hooks/usePages';
import { SafeHtml } from '../components/SafeHtml';
import { Link } from '../components/Link';
import { Home, ChevronRight } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function PageView() {
  const location = useLocation();
  const slug = location.pathname;
  const { page, loading } = usePageBySlug(slug);
  const { pages } = usePages();
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page || !page.content) return;

    const headings: TocItem[] = [];
    page.content.forEach((block: any, index: number) => {
      if (block.type === 'heading' && block.level && block.level <= 3) {
        const id = `heading-${index}`;
        headings.push({
          id,
          text: block.content.replace(/<[^>]*>/g, ''),
          level: block.level,
        });
      }
    });
    setToc(headings);
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    const headingElements = contentRef.current?.querySelectorAll('[id^="heading-"]');
    headingElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [toc]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#FEF5F0] to-white py-12 min-h-[400px]">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
              <div className="h-12 bg-gray-200 rounded w-3/4 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="bg-gradient-to-br from-[#FEF5F0] to-white py-12 min-h-[400px] flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Page non trouvée</h1>
            <p className="text-lg text-gray-600">La page que vous recherchez n'existe pas.</p>
          </div>
        </div>
      </div>
    );
  }

  const childPages = pages.filter((p) => p.parent_id === page.id && p.is_active);

  return (
    <div className="bg-gradient-to-br from-[#FEF5F0] to-white pb-12">
      {page.image_url && (
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img
            src={page.image_url}
            alt={page.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="container mx-auto max-w-6xl">
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">{page.title}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
            <Link href="/" className="hover:text-[#328fce] transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-800 font-medium">{page.title}</span>
          </nav>

          {!page.image_url && (
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-800">{page.title}</h1>
          )}

          <div className="flex gap-8">
            {toc.length > 0 && (
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-24">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Sommaire</h2>
                    <nav className="space-y-2">
                      {toc.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className={`block text-sm transition-colors ${
                            activeId === item.id
                              ? 'text-[#328fce] font-semibold'
                              : 'text-gray-600 hover:text-[#328fce]'
                          }`}
                          style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                        >
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </div>
              </aside>
            )}

            <div className="flex-1 min-w-0">
              <article
                ref={contentRef}
                className="bg-white rounded-2xl shadow-lg p-6 md:p-10 mb-8"
              >
                <div className="prose prose-lg max-w-none">
                  {Array.isArray(page.content) && page.content.length > 0 ? (
                    page.content.map((block: any, index: number) => {
                      if (block.type === 'paragraph') {
                        return (
                          <SafeHtml
                            key={index}
                            as="p"
                            className="mb-4 text-gray-700 leading-relaxed"
                            html={block.content}
                          />
                        );
                      }
                      if (block.type === 'heading') {
                        const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
                        const isInToc = block.level && block.level <= 3;
                        return (
                          <SafeHtml
                            key={index}
                            as={HeadingTag}
                            id={isInToc ? `heading-${index}` : undefined}
                            className="font-bold text-gray-800 mt-8 mb-4 scroll-mt-24"
                            html={block.content}
                          />
                        );
                      }
                      if (block.type === 'image') {
                        return (
                          <div key={index} className="my-6">
                            <img
                              src={block.url}
                              alt={block.alt || ''}
                              className="rounded-lg shadow-md w-full h-auto"
                            />
                            {block.caption && (
                              <p className="text-sm text-gray-500 text-center mt-2">
                                {block.caption}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <p className="text-gray-700 leading-relaxed">Contenu à venir...</p>
                  )}
                </div>
              </article>

              {childPages.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Pages liées</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {childPages.map((childPage) => (
                      <Link
                        key={childPage.id}
                        href={`/${childPage.slug}`}
                        className="group p-4 border-2 border-gray-100 rounded-xl hover:border-[#328fce] hover:bg-[#328fce]/5 transition-all"
                      >
                        <h3 className="font-semibold text-gray-800 group-hover:text-[#328fce] transition-colors mb-2">
                          {childPage.title}
                        </h3>
                        {childPage.meta_description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {childPage.meta_description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
