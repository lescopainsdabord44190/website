import { useState } from 'react';
import { RefreshCw, Clock, Gamepad2 } from 'lucide-react';
import { useSupabaseStatus } from '../contexts/SupabaseStatusContext';
import { MaintenanceGame } from './MaintenanceGame';

export function MaintenanceOverlay() {
  const { isOnline, isChecking, checkConnection } = useSupabaseStatus();
  const [showGame, setShowGame] = useState(false);

  if (isOnline) {
    return null;
  }

  // Afficher le jeu si demandé
  if (showGame) {
    return <MaintenanceGame onBack={() => setShowGame(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#FEF5F0] to-white z-[9999] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center relative z-10">
        <h1 className="text-8xl font-bold text-[#ff6243] mb-4">🔧</h1>
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Maintenance en cours
        </h2>
        
        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
          Notre service est temporairement indisponible.<br />
          Nous effectuons une opération de maintenance et nous serons de retour très bientôt !
        </p>

        {isChecking && (
          <div className="mb-6 flex items-center justify-center gap-2 text-[#328fce]">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Vérification en cours...</span>
          </div>
        )}

        <div className="mb-8 flex items-center justify-center gap-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            Nouvelle tentative automatique dans quelques instants...
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <button
            onClick={() => setShowGame(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#2a7ab8] transition-all hover:scale-105 font-medium shadow-lg"
          >
            <Gamepad2 className="w-5 h-5" />
            Jouer avec Pollux en attendant
          </button>

          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-2 bg-[#ff6243] text-white px-6 py-3 rounded-full hover:bg-[#ff9fa8] transition-all hover:scale-105 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Vérification...' : 'Réessayer maintenant'}
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            La page se rafraîchira automatiquement dès que le service sera de retour.
          </p>
        </div>
      </div>

      <img
        src="/illustrations/mascottes/demis mascotte2.png"
        alt="Mascotte en maintenance"
        className="w-32 h-32 md:w-40 md:h-40 object-contain fixed mascotte-maintenance pointer-events-none"
      />

      <style>{`
        @keyframes maintenance {
          0% {
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%) rotate(0deg);
          }
          25% {
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%) rotate(5deg);
          }
          50% {
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%) rotate(-5deg);
          }
          75% {
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%) rotate(3deg);
          }
          100% {
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%) rotate(0deg);
          }
        }

        .mascotte-maintenance {
          animation: maintenance 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

