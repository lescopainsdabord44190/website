import { usePageBySlug } from '../hooks/usePages';

interface PageViewProps {
  slug: string;
}

export function PageView({ slug }: PageViewProps) {
  const { page, loading } = usePageBySlug(slug);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
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
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Page non trouvée</h1>
            <p className="text-lg text-gray-600">La page que vous recherchez n'existe pas.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">{page.title}</h1>

            <div className="prose prose-lg max-w-none">
              {Array.isArray(page.content) && page.content.length > 0 ? (
                page.content.map((block: any, index: number) => {
                  if (block.type === 'paragraph') {
                    return (
                      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                        {block.content}
                      </p>
                    );
                  }
                  if (block.type === 'heading') {
                    const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
                    return (
                      <HeadingTag key={index} className="font-bold text-gray-800 mt-8 mb-4">
                        {block.content}
                      </HeadingTag>
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
                          <p className="text-sm text-gray-500 text-center mt-2">{block.caption}</p>
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
        </div>
      </div>
    </div>
  );
}
