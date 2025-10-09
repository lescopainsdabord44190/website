import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { trackEvent } = useTracking();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Erreur lors de la modification du mot de passe');
        trackEvent(TrackingEvent.PASSWORD_RESET_COMPLETED, {
          [TrackingProperty.SUCCESS]: false,
          [TrackingProperty.ERROR_MESSAGE]: updateError.message,
        });
      } else {
        trackEvent(TrackingEvent.PASSWORD_RESET_COMPLETED, {
          [TrackingProperty.SUCCESS]: true,
        });
        navigate('/profile');
      }
    } catch (err) {
      setError('Une erreur est survenue');
      trackEvent(TrackingEvent.PASSWORD_RESET_COMPLETED, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#84c19e] via-[#328fce] to-[#ff9fa8] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/illustrations/mascottes/ballon.png')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Nouveau départ !
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Créez un nouveau mot de passe sécurisé pour protéger votre compte. Choisissez-en un que vous pourrez facilement retenir.
            </p>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-[#FEF5F0] to-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mx-auto mb-4" />
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Nouveau mot de passe</h1>
              <p className="text-gray-600">Choisissez un nouveau mot de passe pour votre compte</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
                <p className="mt-2 text-xs text-gray-500">Minimum 6 caractères</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white px-6 py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Check className="w-5 h-5" />
                {loading ? 'Modification en cours...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

