import { useState } from 'react';
import { Link } from '../components/Link';
import { Home, ArrowLeft, Gamepad2 } from 'lucide-react';
import { MaintenanceGame } from '../components/MaintenanceGame';

export function NotFoundPage() {
  const [showGame, setShowGame] = useState(false);

  if (showGame) {
    return <MaintenanceGame onBack={() => setShowGame(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl w-full text-center relative z-10">
        <h1 className="text-8xl font-bold text-[#328fce] mb-4">404</h1>
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Oups ! Page introuvable
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          On dirait que notre mascotte s'est perdue en chemin...<br />
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#2a7ab8] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 bg-[#84c19e] text-white px-6 py-3 rounded-full hover:bg-[#6da884] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Besoin d'aide ? <Link href="/contact" className="text-[#328fce] hover:underline font-medium">Contactez-nous</Link>
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setShowGame(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#84c19e] text-white px-6 py-3 rounded-full hover:bg-[#6da884] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <Gamepad2 className="w-5 h-5" />
            Jouer avec Pollux
          </button>
        </div>
      </div>

      <img
        src="/illustrations/mascottes/demis mascotte1.png"
        alt="Mascotte perdue"
        className="w-32 h-32 md:w-40 md:h-40 object-contain fixed mascotte-walking pointer-events-none"
      />

      <style>{`
        @keyframes walkAround {
          0% {
            left: -10%;
            bottom: -85px;
            top: auto;
            transform: scaleX(1) rotate(0deg);
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          5% {
            left: -5%;
            bottom: -85px;
            top: auto;
            transform: scaleX(1.1) rotate(0deg);
            animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          20% {
            left: 40%;
            bottom: -85px;
            top: auto;
            transform: scaleX(0.9) rotate(0deg);
            animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          45% {
            left: 105%;
            bottom: -85px;
            top: auto;
            transform: scaleX(1) rotate(0deg);
            animation-timing-function: cubic-bezier(0.87, 0, 0.13, 1);
          }
          48% {
            left: 110%;
            bottom: -85px;
            top: auto;
            transform: scaleX(1) rotate(0deg);
            animation-timing-function: ease-out;
          }
          50% {
            left: 110%;
            bottom: auto;
            top: -85px;
            transform: scaleX(-1) rotate(180deg);
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          55% {
            left: 105%;
            bottom: auto;
            top: -85px;
            transform: scaleX(-1) rotate(180deg);
            animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          70% {
            left: 60%;
            bottom: auto;
            top: -85px;
            transform: scaleX(-1) rotate(180deg);
            animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          95% {
            left: -5%;
            bottom: auto;
            top: -85px;
            transform: scaleX(-1) rotate(180deg);
            animation-timing-function: cubic-bezier(0.87, 0, 0.13, 1);
          }
          98% {
            left: -10%;
            bottom: auto;
            top: -85px;
            transform: scaleX(-1.2, 0.8) rotate(180deg);
            animation-timing-function: ease-out;
          }
          100% {
            left: -10%;
            bottom: -85px;
            top: auto;
            transform: scaleX(1) rotate(0deg);
          }
        }

        .mascotte-walking {
          animation: walkAround 12s linear infinite;
        }
      `}</style>
    </div>
  );
}

