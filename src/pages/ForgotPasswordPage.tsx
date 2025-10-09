import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Link } from '../components/Link';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

export function ForgotPasswordPage() {
  const { trackEvent } = useTracking();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError('Une erreur est survenue. Vérifiez votre adresse email.');
        trackEvent(TrackingEvent.PASSWORD_RESET_REQUESTED, {
          [TrackingProperty.SUCCESS]: false,
          [TrackingProperty.ERROR_MESSAGE]: error.message,
        });
      } else {
        setSuccess(true);
        trackEvent(TrackingEvent.PASSWORD_RESET_REQUESTED, {
          [TrackingProperty.SUCCESS]: true,
        });
      }
    } catch (err) {
      setError('Une erreur est survenue');
      trackEvent(TrackingEvent.PASSWORD_RESET_REQUESTED, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[#FEF5F0] to-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Email envoyé !</h1>
            <p className="text-gray-600">
              Consultez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl text-blue-900 text-sm">
              Un email a été envoyé à <strong className="font-semibold">{email}</strong>. Si vous ne le voyez pas, vérifiez vos spams.
            </div>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-[#328fce] hover:text-[#84c19e] transition-colors font-semibold text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#ff9fa8] via-[#84c19e] to-[#328fce] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/illustrations/mascottes/crayon.png')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
              <Mail className="w-10 h-10" />
            </div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Pas de panique !
            </h2>
            <p className="text-xl mb-8 text-white/90">
              On oublie tous nos mots de passe de temps en temps. Entrez votre email et nous vous enverrons un lien pour en créer un nouveau.
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mt-48"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mb-40"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-[#FEF5F0] to-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mx-auto mb-4" />
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Mot de passe oublié</h1>
              <p className="text-gray-600">
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#328fce] focus:border-[#328fce] outline-none transition-all text-gray-800"
                  placeholder="votre@email.fr"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white px-6 py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Mail className="w-5 h-5" />
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-gray-600 hover:text-[#328fce] transition-colors text-sm flex items-center justify-center gap-2 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

