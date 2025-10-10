import { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, Home, MapPin, Share2, Menu, FileText, Plus, X, Upload, ExternalLink, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RichTextEditor } from '../../components/RichTextEditor';
import { OutputData } from '@editorjs/editorjs';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'text' | 'richtext' | 'images';
}

interface ImageItem {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
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
    keys: ['footer_', 'copyright_', 'legal_', 'partners_'],
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

  const handleImageUpload = async (file: File, settingKey: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${settingKey}_${Date.now()}.${fileExt}`;
      const filePath = `content/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('page_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('page_assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors de l\'upload de l\'image');
      return null;
    }
  };

  const renderImageCollectionEditor = (setting: Setting) => {
    let images: ImageItem[] = [];
    try {
      images = JSON.parse(setting.value);
      if (!Array.isArray(images)) images = [];
    } catch (e) {
      images = [];
    }

    const addImage = () => {
      const newImages = [
        ...images,
        {
          id: `img-${Date.now()}`,
          imageUrl: '',
          title: '',
          link: '',
        },
      ];
      updateSetting(setting.key, JSON.stringify(newImages));
    };

    const removeImage = (id: string) => {
      const newImages = images.filter((img) => img.id !== id);
      updateSetting(setting.key, JSON.stringify(newImages));
    };

    const updateImage = (id: string, field: keyof ImageItem, value: string) => {
      const newImages = images.map((img) =>
        img.id === id ? { ...img, [field]: value } : img
      );
      updateSetting(setting.key, JSON.stringify(newImages));
    };

    const handleFileSelect = async (id: string, file: File) => {
      const imageUrl = await handleImageUpload(file, setting.key);
      if (imageUrl) {
        updateImage(id, 'imageUrl', imageUrl);
      }
    };

    return (
      <div key={setting.id} className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {setting.description || setting.key}
          </label>
          <button
            onClick={addImage}
            className="flex items-center gap-1 text-sm bg-[#328fce] text-white px-3 py-1.5 rounded hover:bg-[#84c19e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        <div className="space-y-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                </div>
                <button
                  onClick={() => removeImage(image.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Image
                  </label>
                  <div className="flex items-center gap-3">
                    {image.imageUrl && (
                      <img
                        src={image.imageUrl}
                        alt={image.title || 'Preview'}
                        className="w-20 h-20 object-contain bg-white rounded border border-gray-200"
                      />
                    )}
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm transition-colors">
                      <Upload className="w-4 h-4" />
                      {image.imageUrl ? 'Changer' : 'Uploader'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(image.id, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={image.title}
                    onChange={(e) => updateImage(image.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                    placeholder="Nom du partenaire"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lien (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={image.link}
                      onChange={(e) => updateImage(image.id, 'link', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                      placeholder="https://example.com"
                    />
                    {image.link && (
                      <a
                        href={image.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#328fce] hover:text-[#84c19e]"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun élément. Cliquez sur "Ajouter" pour commencer.
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3">Clé: {setting.key}</p>
      </div>
    );
  };

  const renderSettingInput = (setting: Setting) => {
    if (setting.type === 'images') {
      return renderImageCollectionEditor(setting);
    }

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
