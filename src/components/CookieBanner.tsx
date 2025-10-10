import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
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

  const handleMinimize = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsMinimized(true);
    }, 300);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  const closeWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
        aria-label="Afficher les paramètres de cookies"
      >
        <Cookie className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-2 left-2 right-2 md:bottom-4 md:left-auto md:right-6 md:max-w-md z-50 transition-all duration-300 ${
        isClosing ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl border-2 border-[#328fce]/20 overflow-hidden">
        <div className="h-1.5 md:h-2 bg-gradient-to-r from-[#328fce] via-[#84c19e] to-[#ff9fa8]"></div>
        
        <div className="p-3 md:p-6">
          <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center flex-shrink-0">
              <Cookie className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-base md:text-lg mb-0.5 md:mb-1">
                Des cookies ? 🍪
              </h3>
              <p className="text-xs md:text-sm text-gray-600 leading-snug md:leading-relaxed">
                Nous utilisons des cookies pour comprendre comment notre site est utilisé.
              </p>
            </div>
            <button
              onClick={handleMinimize}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Réduire"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:shadow-lg transition-all hover:scale-[1.02] font-medium text-sm md:text-base"
            >
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden xs:inline">D'accord ! 👍</span>
              <span className="xs:hidden">OK 👍</span>
            </button>
            <button
              onClick={handleDecline}
              className="px-3 md:px-4 py-2 md:py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-50 transition-all font-medium text-sm md:text-base whitespace-nowrap"
            >
              Non merci
            </button>
          </div>

          <p className="text-[10px] md:text-xs text-gray-500 mt-2 md:mt-3 text-center leading-tight md:leading-normal">
            <a href="/politique-de-confidentialite" className="text-[#328fce] hover:underline">
              Politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}




