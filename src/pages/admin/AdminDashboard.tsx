import { useAuth } from '../../contexts/AuthContext';
import { FileText, Settings, Lightbulb } from 'lucide-react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router';
import { PagesManager } from './PagesManager';
import { PageEditor } from './PageEditor';
import { SettingsManager } from './SettingsManager';
import { HighlightsManager } from './HighlightsManager';

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const isPageRoute = location.pathname.startsWith('/admin/pages');
  const isSettingsRoute = location.pathname.startsWith('/admin/settings');
  const isHighlightsRoute = location.pathname.startsWith('/admin/highlights');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Administration</h1>
          <p className="text-gray-600">Gérez le contenu de votre site</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <Link
                to="/admin/pages"
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  isPageRoute
                    ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                Pages
              </Link>
              <Link
                to="/admin/highlights"
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  isHighlightsRoute
                    ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="w-5 h-5" />
                Infos importantes
              </Link>
              <Link
                to="/admin/settings"
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  isSettingsRoute
                    ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5" />
                Paramètres
              </Link>
            </nav>
          </div>

          <div className="p-6">
            <Routes>
              <Route index element={<Navigate to="/admin/pages" replace />} />
              <Route path="pages" element={<PagesManager />} />
              <Route path="pages/new" element={<PageEditor page={null} />} />
              <Route path="pages/:id/edit" element={<PageEditor />} />
              <Route path="highlights" element={<HighlightsManager />} />
              <Route path="settings" element={<SettingsManager />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
