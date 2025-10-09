import { useSiteSettings } from '../hooks/useSiteSettings';
import { Phone, Clock } from 'lucide-react';
import { Link } from '../components/Link';
import { SafeHtml } from '../components/SafeHtml';

export function HomePage() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-[#FEF5F0] to-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="/illustrations/mascottes/crayon.png"
                  alt="Mascotte"
                  className="w-24 h-24 object-contain"
                />
                <img
                  src="/illustrations/mascottes/duo épaule.png"
                  alt="Mascotte"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <SafeHtml
                as="h1"
                className="text-4xl md:text-5xl font-bold mb-6 text-gray-800 leading-tight"
                html={settings.home_hero_title || 'Bienvenue aux <em>Copains d\'abord</em>'}
              />
              <SafeHtml
                as="p"
                className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed"
                html={settings.home_hero_subtitle || 'L\'accueil de loisirs qui fait grandir vos enfants dans la joie et la bonne humeur !'}
              />

              <div className="flex flex-col sm:flex-row gap-4">
                {settings.contact_phone && (
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="flex items-center justify-center gap-2 bg-[#ff6243] text-white px-6 py-3 rounded-full hover:bg-[#ff9fa8] transition-all hover:scale-105 font-medium shadow-lg"
                  >
                    <Phone className="w-5 h-5" />
                    {settings.contact_phone}
                  </a>
                )}
                <Link
                  href="/horaires"
                  className="flex items-center justify-center gap-2 bg-[#84c19e] text-white px-6 py-3 rounded-full hover:bg-[#328fce] transition-all hover:scale-105 font-medium shadow-lg"
                >
                  <Clock className="w-5 h-5" />
                  Nos horaires: <strong>7h - 19h</strong>
                </Link>
                <Link
                  href="https://getigne.carteplus.fr/"
                  target='_blank'
                  className="flex items-center justify-center gap-2 bg-[#84c19e] text-white px-6 py-3 rounded-full hover:bg-[#328fce] transition-all hover:scale-105 font-medium shadow-lg"
                >
                  <Clock className="w-5 h-5" />
                  Portail familles
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#ffbf40] rounded-full opacity-50 blur-2xl"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#ff9fa8] rounded-full opacity-50 blur-2xl"></div>
              <img
                src="/photos/team.jpg"
                alt="L'équipe des Copains d'abord"
                className="relative rounded-3xl shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-[#84c19e] to-[#328fce] rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <img src="/illustrations/mascottes/crayon.png" alt="" className="w-10 h-10 object-contain" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Activités créatives</h3>
              <p className="text-white/90 leading-relaxed">
                Des ateliers variés pour développer la créativité et l'imagination de vos enfants.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#ffbf40] to-[#ff9fa8] rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <img src="/illustrations/mascottes/duo épaule.png" alt="" className="w-10 h-10 object-contain" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Esprit d'équipe</h3>
              <p className="text-white/90 leading-relaxed">
                Des activités collectives pour apprendre le vivre ensemble et se faire des copains.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#ff6243] to-[#ff9fa8] rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <img src="/illustrations/mascottes/duo.png" alt="" className="w-10 h-10 object-contain" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Encadrement qualifié</h3>
              <p className="text-white/90 leading-relaxed">
                Une équipe passionnée et diplômée pour garantir la sécurité et le bien-être de chaque enfant.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-[#FEF5F0] to-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
            Rejoignez l'aventure des Copains d'abord
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Inscrivez vos enfants pour des vacances inoubliables remplies d'activités, de découvertes et de moments
            partagés.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-[#328fce] text-white px-8 py-4 rounded-full hover:bg-[#84c19e] transition-all hover:scale-105 font-medium shadow-lg text-lg"
          >
            Contactez-nous
          </Link>
        </div>
      </section>
    </div>
  );
}
