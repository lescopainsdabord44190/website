import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Petit délai pour l'animation d'entrée
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    closeWithAnimation();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    closeWithAnimation();
  };

  const closeWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 transition-all duration-300 ${
        isClosing ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#328fce]/20 overflow-hidden">
        {/* Barre colorée en haut */}
        <div className="h-2 bg-gradient-to-r from-[#328fce] via-[#84c19e] to-[#ff9fa8]"></div>
        
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg mb-1">
                Des cookies ? 🍪
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Nous utilisons ce qu'on appelle des "cookies" pour comprendre comment notre site est utilisé.
              </p>
            </div>
            <button
              onClick={closeWithAnimation}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all hover:scale-[1.02] font-medium"
            >
              <Check className="w-4 h-4" />
              D'accord ! 👍
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Non merci
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            En savoir plus sur notre{' '}
            <a href="/politique-de-confidentialite" className="text-[#328fce] hover:underline">
              politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}




