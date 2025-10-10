import { useEffect, useState, useRef } from 'react';
import { useLocation, Link as RouterLink, useNavigate, Navigate } from 'react-router';
import { usePageBySlug, usePages, buildFullPath } from '../hooks/usePages';
import { Link } from '../components/Link';
import { Home, ChevronRight, Edit } from 'lucide-react';
import { migrateOldContentToEditorJS } from '../lib/contentMigration';
import { useAuth } from '../contexts/AuthContext';
import { EditorJSRenderer } from '../components/EditorJSRenderer';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface EditorBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
  };
}

export function PageView() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname;
  const { page, loading } = usePageBySlug(slug);
  const { pages } = usePages();
  const { isAdmin } = useAuth();
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page || !page.content) return;

    const content = migrateOldContentToEditorJS(page.content);
    if (!content || !content.blocks) return;

    const decodeHtml = (html: string): string => {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    };

    const headings: TocItem[] = [];
    content.blocks.forEach((block, index: number) => {
      const editorBlock = block as EditorBlock;
      if (editorBlock.type === 'header' && editorBlock.data.level && editorBlock.data.level <= 3 && editorBlock.data.text) {
        const id = `heading-${index}`;
        const cleanText = editorBlock.data.text.replace(/<[^>]*>/g, '');
        headings.push({
          id,
          text: decodeHtml(cleanText),
          level: editorBlock.data.level,
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
    return <Navigate to="/404" replace />;
  }

  const buildBreadcrumb = () => {
    const breadcrumb: Array<{ title: string; path: string; id: string }> = [];
    let currentPage: typeof page | undefined = page;
    
    while (currentPage) {
      breadcrumb.unshift({
        title: currentPage.title,
        path: buildFullPath(currentPage.id, pages),
        id: currentPage.id,
      });
      
      if (currentPage.parent_id) {
        currentPage = pages.find((p) => p.id === currentPage!.parent_id);
      } else {
        currentPage = undefined;
      }
    }
    
    return breadcrumb;
  };

  const breadcrumbItems = buildBreadcrumb();
  const childPages = pages.filter((p) => p.parent_id === page.id && p.is_active);

  const allBreadcrumbOptions = [
    { title: 'Accueil', path: '/', id: 'home' },
    ...breadcrumbItems,
  ];

  const handleBreadcrumbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const path = e.target.value;
    if (path) {
      navigate(path);
    }
  };

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
          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="flex-1 min-w-0">
              {/* Mobile breadcrumb (select) */}
              <div className="md:hidden">
                <select
                  value={page.id === 'home' ? '/' : buildFullPath(page.id, pages)}
                  onChange={handleBreadcrumbChange}
                  className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 transition-all appearance-none cursor-pointer shadow-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                >
                  {allBreadcrumbOptions.map((item, index) => (
                    <option key={item.id} value={item.path}>
                      {'  '.repeat(index) + item.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop breadcrumb */}
              <nav className="hidden md:flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                <Link href="/" className="hover:text-[#328fce] transition-colors flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  <span>Accueil</span>
                </Link>
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      {isLast ? (
                        <span className="text-gray-800 font-medium">{item.title}</span>
                      ) : (
                        <Link href={item.path} className="hover:text-[#328fce] transition-colors">
                          {item.title}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
            
            {isAdmin && (
              <RouterLink
                to={`/admin/pages/${page.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e] transition-colors text-sm shadow-md flex-shrink-0"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Modifier</span>
              </RouterLink>
            )}
          </div>

          {!page.image_url && (
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-800">{page.title}</h1>
          )}

          <div className="flex gap-8">
            {page.show_toc !== false && toc.length > 0 && (
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
                  {(() => {
                    const content = migrateOldContentToEditorJS(page.content);
                    if (!content || !content.blocks || content.blocks.length === 0) {
                      return <p className="text-gray-700 leading-relaxed">Contenu à venir...</p>;
                    }
                    return <EditorJSRenderer content={content} enableToc={true} />;
                  })()}
                </div>
              </article>

              {childPages.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Pages liées</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {childPages.map((childPage) => (
                      <Link
                        key={childPage.id}
                        href={buildFullPath(childPage.id, pages)}
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
