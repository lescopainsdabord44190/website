import { useState } from 'react';
import { useHighlights, Highlight } from '../../hooks/useHighlights';
import { Plus, Edit, Trash2, GripVertical, Save, X } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';
import { OutputData } from '@editorjs/editorjs';
import * as LucideIcons from 'lucide-react';

const GRADIENT_THEMES = [
  { id: 'blue-green', name: 'Annonce', colors: 'from-[#84c19e] to-[#328fce]', description: 'Information générale' },
  { id: 'purple-blue', name: 'Événement', colors: 'from-purple-500 to-blue-500', description: 'Activité ou sortie spéciale' },
  { id: 'green-cyan', name: 'Bonne nouvelle', colors: 'from-green-400 to-cyan-500', description: 'Succès ou bonne surprise' },
  { id: 'yellow-pink', name: 'À noter', colors: 'from-[#ffbf40] to-[#ff9fa8]', description: 'Attire l\'attention' },
  { id: 'red-pink', name: 'Important', colors: 'from-[#ff6243] to-[#ff9fa8]', description: 'Information prioritaire' },
  { id: 'orange-red', name: 'Urgent', colors: 'from-orange-400 to-red-500', description: 'Alerte ou urgence' },
];

const AVAILABLE_ICONS = [
  'Lightbulb', 'Sparkles', 'Star', 'Heart', 'Info', 'AlertCircle', 
  'CheckCircle', 'Calendar', 'Clock', 'Gift', 'Trophy', 'Award',
  'Bell', 'Bookmark', 'Flag', 'Target', 'Zap', 'TrendingUp',
  'Users', 'UserPlus', 'MessageCircle', 'Mail', 'Phone', 'MapPin',
  'Home', 'Building', 'School', 'Briefcase', 'Coffee', 'Music',
  'Camera', 'Image', 'Film', 'Book', 'FileText', 'Folder'
];

export function HighlightsManager() {
  const { highlights, loading, createHighlight, updateHighlight, deleteHighlight, reorderHighlights } = useHighlights();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Highlight>>({
    title: '',
    content: { time: Date.now(), blocks: [], version: '2.28.0' },
    link: '',
    link_label: '',
    gradient_theme: 'blue-green',
    icon: 'Lightbulb',
    order_index: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleEdit = (highlight: Highlight) => {
    setEditingId(highlight.id);
    setFormData(highlight);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      title: '',
      content: { time: Date.now(), blocks: [], version: '2.28.0' },
      link: '',
      gradient_theme: 'blue-green',
      icon: 'Lightbulb',
      order_index: highlights.length,
      is_active: true,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: { time: Date.now(), blocks: [], version: '2.28.0' },
      link: '',
      link_label: '',
      gradient_theme: 'blue-green',
      icon: 'Lightbulb',
      order_index: 0,
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const result = await createHighlight(formData as Omit<Highlight, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
        if (result.success) {
          handleCancel();
        } else {
          alert('Erreur lors de la création');
        }
      } else if (editingId) {
        const result = await updateHighlight(editingId, formData);
        if (result.success) {
          handleCancel();
        } else {
          alert('Erreur lors de la mise à jour');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette information ?')) {
      return;
    }

    const result = await deleteHighlight(id);
    if (!result.success) {
      alert('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (highlight: Highlight) => {
    await updateHighlight(highlight.id, { is_active: !highlight.is_active });
  };

  const renderIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <LucideIcons.Lightbulb className="w-5 h-5" />;
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...highlights];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);

    setDraggedIndex(null);
    setDragOverIndex(null);

    await reorderHighlights(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Informations à ne pas manquer</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les informations importantes affichées sur la page d'accueil (maximum 3 actives)
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreate}
            disabled={highlights.filter(h => h.is_active).length >= 3}
            className="flex items-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouvelle information
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-[#328fce]">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {isCreating ? 'Nouvelle information' : 'Modifier l\'information'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                placeholder="Titre de l'information"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu *
              </label>
              <RichTextEditor
                value={formData.content as OutputData}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lien (optionnel)
              </label>
              <input
                type="text"
                value={formData.link || ''}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                placeholder="https://example.com"
              />
              {formData.link && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Libellé du bouton (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.link_label || ''}
                    onChange={(e) => setFormData({ ...formData, link_label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                    placeholder="En savoir plus"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si vide, la card entière sera cliquable sans bouton visible
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thème de couleur *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GRADIENT_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, gradient_theme: theme.id })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.gradient_theme === theme.id
                        ? 'border-[#328fce] ring-2 ring-[#328fce] ring-opacity-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`h-12 rounded bg-gradient-to-r ${theme.colors} mb-2`}></div>
                    <p className="text-sm font-medium text-gray-700">{theme.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icône *
              </label>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {AVAILABLE_ICONS.map((iconName) => {
                  const Icon = (LucideIcons as any)[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                        formData.icon === iconName
                          ? 'border-[#328fce] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={iconName}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Icône sélectionnée: {formData.icon}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Activer cette information
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#328fce] text-white px-6 py-3 rounded-lg hover:bg-[#84c19e] transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
            >
              <X className="w-5 h-5" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {highlights.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Aucune information à afficher</p>
          <p className="text-sm text-gray-500 mt-2">
            Cliquez sur "Nouvelle information" pour commencer
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {highlights.map((highlight, index) => {
            const theme = GRADIENT_THEMES.find(t => t.id === highlight.gradient_theme);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            
            return (
              <div
                key={highlight.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all ${
                  highlight.is_active ? 'border-green-200' : 'border-gray-200'
                } ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${
                  isDragOver ? 'border-[#328fce] border-dashed scale-105' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex items-center gap-2 text-gray-400 hover:text-gray-600 cursor-move mt-1">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${theme?.colors} flex items-center justify-center text-white flex-shrink-0`}>
                        {renderIcon(highlight.icon)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800">{highlight.title}</h3>
                          {!highlight.is_active && (
                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              Inactif
                            </span>
                          )}
                          {theme && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {theme.name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {highlight.link && (
                            <>
                              <p className="truncate">Lien: {highlight.link}</p>
                              {highlight.link_label && (
                                <p className="text-xs text-blue-600 mt-1">Bouton: {highlight.link_label}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(highlight)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          highlight.is_active ? 'bg-[#328fce]' : 'bg-gray-300'
                        }`}
                        title={highlight.is_active ? 'Désactiver' : 'Activer'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            highlight.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleEdit(highlight)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(highlight.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {highlights.filter(h => h.is_active).length > 3 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          ⚠️ Attention: Plus de 3 informations sont actives. Seules les 3 premières seront affichées sur la page d'accueil.
        </div>
      )}
    </div>
  );
}

