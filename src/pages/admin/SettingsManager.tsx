import { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, Home, MapPin, Share2, Menu, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RichTextEditor } from '../../components/RichTextEditor';
import { OutputData } from '@editorjs/editorjs';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'text' | 'richtext';
}

interface SettingCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  keys: string[];
}

const CATEGORIES: SettingCategory[] = [
  {
    id: 'home',
    title: 'Page d\'accueil',
    description: 'Personnalisation de la page d\'accueil et sections principales',
    icon: <Home className="w-5 h-5" />,
    keys: ['site_name', 'site_tagline', 'home_', 'hero_', 'welcome_'],
  },
  {
    id: 'contact',
    title: 'Coordonnées et contact',
    description: 'Informations de contact et localisation',
    icon: <MapPin className="w-5 h-5" />,
    keys: ['contact_'],
  },
  {
    id: 'social',
    title: 'Réseaux sociaux',
    description: 'Liens vers les réseaux sociaux',
    icon: <Share2 className="w-5 h-5" />,
    keys: ['social_'],
  },
  {
    id: 'menu',
    title: 'Navigation et menu',
    description: 'Configuration du menu principal et de la navigation',
    icon: <Menu className="w-5 h-5" />,
    keys: ['menu_'],
  },
  {
    id: 'footer',
    title: 'Pied de page',
    description: 'Contenu et configuration du footer',
    icon: <FileText className="w-5 h-5" />,
    keys: ['footer_', 'copyright_', 'legal_'],
  },
];

export function SettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['home'])
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('site_settings')
          .update({
            value: setting.value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', setting.id);

        if (error) throw error;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string | OutputData) => {
    setSettings((prev) =>
      prev.map((s) => {
        if (s.key === key) {
          return {
            ...s,
            value: typeof value === 'string' ? value : JSON.stringify(value)
          };
        }
        return s;
      })
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getSettingsForCategory = (category: SettingCategory): Setting[] => {
    return settings.filter((setting) =>
      category.keys.some((key) => setting.key.startsWith(key))
    );
  };

  const getUncategorizedSettings = (): Setting[] => {
    const categorizedKeys = new Set<string>();
    CATEGORIES.forEach((category) => {
      getSettingsForCategory(category).forEach((setting) => {
        categorizedKeys.add(setting.key);
      });
    });
    return settings.filter((setting) => !categorizedKeys.has(setting.key));
  };

  const renderSettingInput = (setting: Setting) => {
    if (setting.type === 'richtext') {
      let editorContent: OutputData | null = null;
      try {
        editorContent = JSON.parse(setting.value);
      } catch (e) {
        editorContent = { time: Date.now(), blocks: [], version: '2.28.0' };
      }

      return (
        <div key={setting.id} className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {setting.description || setting.key}
          </label>
          <RichTextEditor
            key={setting.key}
            value={editorContent}
            onChange={(content) => updateSetting(setting.key, content)}
          />
          <p className="text-xs text-gray-500 mt-2">Clé: {setting.key}</p>
        </div>
      );
    }

    const isTextarea = setting.value.length > 100 || setting.key.includes('description');
    
    return (
      <div key={setting.id} className="bg-white rounded-lg p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {setting.description || setting.key}
        </label>
        {isTextarea ? (
          <textarea
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-y"
            placeholder={setting.description}
          />
        ) : (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
            placeholder={setting.description}
          />
        )}
        <p className="text-xs text-gray-500 mt-1">Clé: {setting.key}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
      </div>
    );
  }

  const uncategorizedSettings = getUncategorizedSettings();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Paramètres du site</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les paramètres de votre site par catégorie
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50 font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Paramètres enregistrés avec succès
        </div>
      )}

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const categorySettings = getSettingsForCategory(category);
          if (categorySettings.length === 0) return null;

          const isExpanded = expandedCategories.has(category.id);

          return (
            <div
              key={category.id}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#328fce]">{category.icon}</div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    {categorySettings.length} paramètre{categorySettings.length > 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-5 pt-0 space-y-4">
                  {categorySettings.map(renderSettingInput)}
                </div>
              )}
            </div>
          );
        })}

        {uncategorizedSettings.length > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory('other')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-[#328fce]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Autres paramètres
                  </h3>
                  <p className="text-sm text-gray-600">
                    Paramètres non catégorisés
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  {uncategorizedSettings.length} paramètre{uncategorizedSettings.length > 1 ? 's' : ''}
                </span>
                {expandedCategories.has('other') ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </button>

            {expandedCategories.has('other') && (
              <div className="p-5 pt-0 space-y-4">
                {uncategorizedSettings.map(renderSettingInput)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
