import { Link } from './Link';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePages, buildFullPath } from '../hooks/usePages';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, LogOut, Settings, User, LogIn, Home, Newspaper } from 'lucide-react';
import { useState } from 'react';
import { UserMenu } from './UserMenu';

export function Header() {
  const { settings } = useSiteSettings();
  const { pages } = usePages();
  const { user, isAdmin, isEditor, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canAccessAdmin = isAdmin || isEditor;

  const menuPages = pages.filter((page) => page.is_active && page.show_in_menu && !page.parent_id);

  const buildPagePath = (page: typeof pages[0]): string => {
    return buildFullPath(page.id, pages);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-xl text-[#328fce]">
                {settings.site_title || 'Les copains d\'abord'}
              </span>
              <span className="text-sm text-[#84c19e]">
                {settings.site_subtitle || 'Accueil de loisirs associatif'}
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 flex items-center gap-2 hover:text-[#328fce] transition-colors font-medium">
              <Home className="w-4 h-4" />
              Accueil
            </Link>
            {menuPages.map((page) => (
              <Link
                key={page.id}
                href={buildPagePath(page)}
                className="text-gray-700 hover:text-[#328fce] transition-colors font-medium"
              >
                {page.title}
              </Link>
            ))}
            <Link href="/news" className="text-gray-700 hover:text-[#328fce] transition-colors font-medium flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Actualités
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-[#328fce] transition-colors font-medium">
              Contact
            </Link>
            {user ? (
              <UserMenu />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#2a7ab8] transition-colors font-medium shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Se connecter
              </Link>
            )}
          </nav>

          <button
            className="md:hidden text-gray-700 hover:text-[#328fce] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-gray-700 hover:text-[#328fce] transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Accueil
              </Link>
              {menuPages.map((page) => (
                <Link
                  key={page.id}
                  href={buildPagePath(page)}
                  className="text-gray-700 hover:text-[#328fce] transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {page.title}
                </Link>
              ))}
              <Link
                href="/news"
                className="text-gray-700 hover:text-[#328fce] transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Actualités
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-[#328fce] transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-gray-700 hover:text-[#328fce] transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Mon Profil
                  </Link>
                  {canAccessAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 text-[#ff6243] hover:text-[#ff9fa8] transition-colors font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Administration
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-gray-700 hover:text-[#ff6243] transition-colors font-medium py-2 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-3 rounded-lg hover:bg-[#2a7ab8] transition-colors font-medium shadow-sm justify-center mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
