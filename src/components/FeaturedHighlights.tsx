import { useHighlights } from '../hooks/useHighlights';
import { EditorJSRenderer } from './EditorJSRenderer';
import * as LucideIcons from 'lucide-react';
import { Link } from './Link';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';
import { ArrowRight } from 'lucide-react';

const GRADIENT_THEMES: Record<string, string> = {
  'blue-green': 'from-[#84c19e] to-[#328fce]',
  'yellow-pink': 'from-[#ffbf40] to-[#ff9fa8]',
  'red-pink': 'from-[#ff6243] to-[#ff9fa8]',
  'purple-blue': 'from-purple-500 to-blue-500',
  'green-cyan': 'from-green-400 to-cyan-500',
  'orange-red': 'from-orange-400 to-red-500',
};

export function FeaturedHighlights() {
  const { highlights, loading } = useHighlights(true);
  const { trackEvent } = useTracking();

  const renderIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-8 h-8" /> : <LucideIcons.Lightbulb className="w-8 h-8" />;
  };

  if (loading || highlights.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 ${highlights.length === 1 ? 'md:grid-cols-1 max-w-2xl mx-auto' : highlights.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8`}>
          {highlights.map((highlight) => {
            const gradientColors = GRADIENT_THEMES[highlight.gradient_theme] || GRADIENT_THEMES['blue-green'];
            const isExternal = highlight.link?.startsWith('http');
            
            const content = (
              <div
                className={`bg-gradient-to-br ${gradientColors} rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-all ${
                  highlight.link ? 'cursor-pointer hover:scale-105' : ''
                } h-full flex flex-col`}
              >
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 flex-shrink-0">
                  {renderIcon(highlight.icon)}
                </div>
                <h3 className="text-2xl font-bold mb-3">{highlight.title}</h3>
                <div className="text-white/90 leading-relaxed prose prose-invert prose-sm max-w-none flex-grow">
                  <EditorJSRenderer content={highlight.content} />
                </div>
                {highlight.link && highlight.link_label && (
                  <div className="mt-6 pt-4 border-t border-white/50">
                    <span className="inline-flex items-center gap-2 bg-white/60 hover:bg-white px-6 py-3 rounded-full font-medium transition-all text-gray-500 backdrop-blur-sm">
                      {highlight.link_label}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                )}
              </div>
            );

            if (highlight.link) {
              return (
                <Link
                  key={highlight.id}
                  href={highlight.link}
                  target={isExternal ? '_blank' : undefined}
                  onClick={() => {
                    trackEvent(TrackingEvent.HIGHLIGHT_CLICKED, {
                      [TrackingProperty.HIGHLIGHT_ID]: highlight.id,
                      [TrackingProperty.HIGHLIGHT_TITLE]: highlight.title,
                      [TrackingProperty.LOCATION]: 'home_page',
                    });
                  }}
                  className="block h-full"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={highlight.id} className="h-full">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

