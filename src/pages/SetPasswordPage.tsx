import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabase';
import { UserPlus, Check, AlertCircle } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';
import { useAuth } from '../contexts/AuthContext';

export function SetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useTracking();
  const { user, loading: authLoading } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    // Si l'utilisateur est connecté, vérifier s'il a le droit d'être sur cette page
    if (!authLoading && user) {
      // Vérifier si l'utilisateur a déjà défini son mot de passe
      const checkPasswordSet = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('password_set')
            .eq('id', user.id)
            .maybeSingle();
          
          // Si l'utilisateur a déjà défini son mot de passe, rediriger vers sa page appropriée
          if (profile?.password_set === true) {
            // Vérifier les rôles pour rediriger vers la bonne page
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);

            const hasAdminAccess =
              rolesData?.some((row) => row.role === 'admin' || row.role === 'editor') ?? false;

            navigate(hasAdminAccess ? '/admin' : '/');
            return;
          }
          
          // Si l'utilisateur n'a pas de profil, rediriger aussi
          if (!profile) {
            navigate('/');
            return;
          }
        } catch (error) {
          // En cas d'erreur, rediriger vers la homepage pour sécurité
          navigate('/');
        }
      };
      
      // Vérifier si l'utilisateur a le droit d'être sur cette page
      checkPasswordSet();
    }
  }, [user, authLoading, navigate, location]);

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
        setError('Erreur lors de la définition du mot de passe');
        trackEvent(TrackingEvent.PASSWORD_RESET_COMPLETED, {
          [TrackingProperty.SUCCESS]: false,
          [TrackingProperty.ERROR_MESSAGE]: updateError.message,
        });
      } else {
        // Marquer que l'utilisateur a défini son mot de passe
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ password_set: true })
            .eq('id', user.id);
        }

        trackEvent(TrackingEvent.PASSWORD_RESET_COMPLETED, {
          [TrackingProperty.SUCCESS]: true,
        });
        
        // Vérifier les rôles pour rediriger vers la bonne page
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id);

        const hasAdminAccess =
          rolesData?.some((row) => row.role === 'admin' || row.role === 'editor') ?? false;

        navigate(hasAdminAccess ? '/admin' : '/profile');
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#84c19e] via-[#328fce] to-[#ff9fa8] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/illustrations/mascottes/mascotte 1.png')] bg-contain bg-center bg-no-repeat opacity-20"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
              <UserPlus className="w-10 h-10" />
            </div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Bienvenue !
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Vous avez été invité à rejoindre notre plateforme. Pour commencer, créez un mot de passe sécurisé pour protéger votre compte.
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
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Créer votre mot de passe</h1>
              <p className="text-gray-600">Définissez un mot de passe sécurisé pour finaliser votre inscription</p>
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
                  Mot de passe
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
                {loading ? 'Création en cours...' : 'Créer mon mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

