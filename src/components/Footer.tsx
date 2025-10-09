import { useSiteSettings } from '../hooks/useSiteSettings';
import { Phone, Mail } from 'lucide-react';

export function Footer() {
  const { settings } = useSiteSettings();

  return (
    <footer className="bg-[#328fce] text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="/logo-white.png" alt="Logo Les copains d'abord" className="h-12 w-auto" />
            <p className="text-white/90 text-sm leading-relaxed">
              Accueil de loisirs pour enfants à Gétigné. Un lieu où vos enfants s'épanouissent dans la joie et la bonne humeur.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <div className="space-y-2">
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
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
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Informations</h3>
            <p className="text-white/90 text-sm leading-relaxed">
              Association loi 1901<br />
              Gétigné, Loire-Atlantique
            </p>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-6 text-center text-white/80 text-sm">
          <p>{settings.footer_content || '© 2025 Les copains d\'abord - Gétigné'}</p>
        </div>
      </div>
    </footer>
  );
}
