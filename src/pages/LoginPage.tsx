import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut } from 'lucide-react';
import { Link } from '../components/Link';
import { PasswordInput } from '../components/PasswordInput';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const { signIn, signOut, user: loggedInUser, avatarUrl } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError('Email ou mot de passe incorrect');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          navigate(roleData ? '/admin' : '/');
        }
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      // L'utilisateur reste sur cette page
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#328fce] via-[#84c19e] to-[#ff9fa8] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/illustrations/mascottes/duo.png')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md">
            <Link href="/">
              <img src="/logo-white.png" alt="Logo" className="h-20 w-auto mb-8" />
            </Link>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Bienvenue !
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Connectez-vous pour accéder à votre espace personnel et gérer votre compte.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Espace sécurisé</h3>
                  <p className="text-white/80 text-sm">Vos données sont protégées</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Accès rapide</h3>
                  <p className="text-white/80 text-sm">Gérez votre profil en quelques clics</p>
                </div>
              </div>
            </div>
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
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Connexion</h1>
              <p className="text-gray-600">Accédez à votre espace</p>
            </div>

            {loggedInUser && (
              <div className="mb-6 p-5 bg-gradient-to-br from-[#328fce]/10 to-[#84c19e]/10 border-2 border-[#328fce]/20 rounded-2xl">
                <p className="text-sm font-medium text-gray-600 mb-3">
                  Vous êtes connecté en tant que :
                </p>
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {loggedInUser.email?.[0].toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {loggedInUser.email}
                    </p>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex gap-1 items-center text-sm text-blue-600 hover:text-[#328fce] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4" />
                      {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
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

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#328fce] to-[#84c19e] text-white px-6 py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <LogIn className="w-5 h-5" />
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-600 hover:text-[#328fce] transition-colors font-medium"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  );
}
