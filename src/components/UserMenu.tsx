import { useState, useRef, useEffect } from 'react';
import { User, Settings, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from './Link';

export function UserMenu() {
  const { user, isAdmin, isEditor, signOut, avatarUrl } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const getInitials = () => {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const firstName =
      typeof metadata.first_name === 'string' ? (metadata.first_name as string) : '';
    const lastName =
      typeof metadata.last_name === 'string' ? (metadata.last_name as string) : '';

    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();

    if (initials) {
      return initials;
    }

    const email = user.email ?? '';
    if (!email) {
      return '?';
    }

    const emailParts = email.split('@')[0];
    if (!emailParts) {
      return email.substring(0, 2).toUpperCase();
    }

    const segments = emailParts.split('.');
    if (segments.length >= 2) {
      return `${segments[0]?.[0] ?? ''}${segments[1]?.[0] ?? ''}`.toUpperCase() || email.substring(0, 2).toUpperCase();
    }

    return emailParts.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover shadow-md"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#328fce] to-[#84c19e] flex items-center justify-center text-white font-semibold shadow-md">
            {getInitials()}
          </div>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">Connecté en tant que</p>
            <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
          </div>
          
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User className="w-4 h-4" />
            <span className="font-medium">Mon Profil</span>
          </Link>

          {(isAdmin || isEditor) && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">Administration</span>
            </Link>
          )}

          <div className="border-t border-gray-100 my-1"></div>

          <button
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  );
}


