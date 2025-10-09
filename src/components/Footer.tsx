import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePages, buildFullPath } from '../hooks/usePages';
import { Phone, Mail } from 'lucide-react';
import { siFacebook, siInstagram } from 'simple-icons';
import { EditorJSRenderer } from './EditorJSRenderer';
import { OutputData } from '@editorjs/editorjs';
import { Link } from './Link';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

export function Footer() {
  const { settings } = useSiteSettings();
  const { pages } = usePages();
  const { trackEvent } = useTracking();
  
  const footerPages = pages.filter(page => page.is_active && page.show_in_footer);

  return (
    <footer className="bg-[#328fce] text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="/logo-white.png" alt="Logo Les copains d'abord" className="h-12 w-auto" />

            {settings.home_hero_subtitle && (
              <EditorJSRenderer 
                content={JSON.parse(settings.home_hero_subtitle) as OutputData} 
                className="[&_p]:text-white/90 [&_p]:mb-2 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:text-white/90 [&_blockquote]:bg-white/10 [&_blockquote]:border-white/40 [&_blockquote]:text-white/90 [&_a]:border-b [&_a]:border-dotted [&_a]:border-white/60 [&_a]:hover:border-white text-sm"
              />
            )}
            {settings.footer_additionalContent && (() => {
              try {
                const content = JSON.parse(settings.footer_additionalContent) as OutputData;
                
                return (
                  <div className={footerPages.length > 0 ? "mt-6" : ""}>
                    <EditorJSRenderer 
                      content={content} 
                      className="[&_p]:text-white/90 [&_p]:mb-2 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:text-white/90 [&_blockquote]:bg-white/10 [&_blockquote]:border-white/40 [&_blockquote]:text-white/90 [&_a]:border-b [&_a]:border-dotted [&_a]:border-white/60 [&_a]:hover:border-white text-sm"
                    />
                  </div>
                );
              } catch (e) {
                return null;
              }
            })()}
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <div className="space-y-2 mb-4">
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
                  onClick={() => trackEvent(TrackingEvent.PHONE_CLICKED, {
                    [TrackingProperty.LOCATION]: 'footer',
                    [TrackingProperty.PHONE_NUMBER]: settings.contact_phone,
                  })}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {settings.contact_phone}
                </a>
              )}
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {settings.contact_email}
                </a>
              )}
            </div>
            {(settings.social_facebook || settings.social_instagram) && (
              <div className="flex items-center gap-3 pt-2">
                <h3 className="font-bold text-lg mb-4">Suivez-nous</h3>
                {settings.social_facebook && (
                  <a
                    href={settings.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent(TrackingEvent.FACEBOOK_CLICKED, {
                      [TrackingProperty.LOCATION]: 'footer',
                      [TrackingProperty.SOCIAL_NETWORK]: 'facebook',
                    })}
                    className="flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                    aria-label="Facebook"
                  >
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      className="w-5 h-5 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Facebook</title>
                      <path d={siFacebook.path} />
                    </svg>
                  </a>
                )}
                {settings.social_instagram && (
                  <a
                    href={settings.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent(TrackingEvent.INSTAGRAM_CLICKED, {
                      [TrackingProperty.LOCATION]: 'footer',
                      [TrackingProperty.SOCIAL_NETWORK]: 'instagram',
                    })}
                    className="flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                    aria-label="Instagram"
                  >
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      className="w-5 h-5 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Instagram</title>
                      <path d={siInstagram.path} />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            {footerPages.length > 0 && (
              <>
                <h3 className="font-bold text-lg mb-4">Liens utiles</h3>
                <ul className="space-y-2">
                  {footerPages.map((page) => (
                    <li key={page.id}>
                      <Link
                        href={buildFullPath(page.id, pages)}
                        className="text-white/90 hover:text-white transition-colors text-sm"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            
          </div>
        </div>

        

        <div className="border-t border-white/20 mt-8 pt-6 text-center text-white/80 text-sm">
        {settings.footer_content && (() => {
          try {
            const content = JSON.parse(settings.footer_content) as OutputData;
            return (
              <EditorJSRenderer 
                content={content}
                className="[&_p]:text-white/90 [&_p]:mb-2 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:text-white/90 [&_blockquote]:bg-white/10 [&_blockquote]:border-white/40 [&_blockquote]:text-white/90 [&_a]:border-b [&_a]:border-dotted [&_a]:border-white/60 [&_a]:hover:border-white text-sm"
              />
            );
          } catch (e) {
            console.error('Error parsing footer content:', e);
            return null;
          }
        })()}
        </div>
      </div>
    </footer>
  );
}
