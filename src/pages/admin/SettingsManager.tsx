import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
}

export function SettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Paramètres du site</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Paramètres enregistrés avec succès
        </div>
      )}

      <div className="space-y-6">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {setting.description || setting.key}
            </label>
            <input
              type="text"
              value={setting.value}
              onChange={(e) => updateSetting(setting.key, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
              placeholder={setting.description}
            />
            <p className="text-xs text-gray-500 mt-1">Clé: {setting.key}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
