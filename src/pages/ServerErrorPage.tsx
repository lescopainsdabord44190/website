import { Link } from '../components/Link';
import { Home, RefreshCw } from 'lucide-react';

export function ServerErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl w-full text-center relative z-10">
        <h1 className="text-8xl font-bold text-[#ff6243] mb-4">500</h1>
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Aïe ! Erreur serveur
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          Notre mascotte est un peu déboussolée...<br />
          Quelque chose s'est mal passé de notre côté. Ne vous inquiétez pas, nous travaillons déjà dessus !
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 bg-[#ff6243] text-white px-6 py-3 rounded-full hover:bg-[#ff9fa8] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#2a7ab8] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Si le problème persiste, <Link href="/contact" className="text-[#328fce] hover:underline font-medium">contactez-nous</Link>
          </p>
        </div>
      </div>

      <img
        src="/illustrations/mascottes/demis mascotte2.png"
        alt="Mascotte surprise"
        className="w-32 h-32 md:w-40 md:h-40 object-contain fixed mascotte-crash pointer-events-none"
      />

      <style>{`
        @keyframes crash {
          0% {
            left: -10%;
            bottom: -85px;
            transform: scaleX(1, 1) rotate(0deg);
            animation-timing-function: ease-in;
          }
          40% {
            left: 92%;
            bottom: -85px;
            transform: scaleX(1, 1) rotate(0deg);
            animation-timing-function: ease-in;
          }
          50% {
            left: 98%;
            bottom: -85px;
            transform: scaleX(0.7, 1.3) rotate(0deg);
            animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          65% {
            left: 88%;
            bottom: -85px;
            transform: scaleX(1.1, 0.9) rotate(-120deg);
            animation-timing-function: ease-out;
          }
          80% {
            left: 85%;
            bottom: -85px;
            transform: scaleX(1.05, 0.95) rotate(-230deg);
            animation-timing-function: ease-in-out;
          }
          95% {
            left: 84%;
            bottom: -85px;
            transform: scaleX(1, 1) rotate(-238deg);
            animation-timing-function: ease-out;
          }
          100% {
            left: 84%;
            bottom: -85px;
            transform: scaleX(1, 1) rotate(-240deg);
          }
        }

        .mascotte-crash {
          animation: crash 3.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

