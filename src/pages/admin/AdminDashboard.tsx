import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Settings, Plus } from 'lucide-react';
import { PagesManager } from './PagesManager';
import { SettingsManager } from './SettingsManager';

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'pages' | 'settings'>('pages');

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
              <button
                onClick={() => setActiveTab('pages')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'pages'
                    ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                Pages
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5" />
                Paramètres
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'pages' && <PagesManager />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
