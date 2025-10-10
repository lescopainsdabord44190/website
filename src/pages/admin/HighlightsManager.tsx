import { useState } from 'react';
import { useHighlights, Highlight } from '../../hooks/useHighlights';
import { Plus, Edit, Trash2, GripVertical, Save, X, Copy } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
    end_date: null,
  });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'duplicate' | 'error' | 'validation';
    title: string;
    message: string;
    onConfirm?: () => void;
    isDangerous?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    type: 'validation',
    title: '',
    message: '',
  });

  const handleEdit = (highlight: Highlight) => {
    setEditingId(highlight.id);
    setFormData(highlight);
    setStartDateInput(highlight.start_date ? new Date(highlight.start_date).toLocaleDateString('fr-FR') : '');
    setEndDateInput(highlight.end_date ? new Date(highlight.end_date).toLocaleDateString('fr-FR') : '');
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setStartDateInput('');
    setEndDateInput('');
    setFormData({
      title: '',
      content: { time: Date.now(), blocks: [], version: '2.28.0' },
      link: '',
      gradient_theme: 'blue-green',
      icon: 'Lightbulb',
      order_index: highlights.length,
      is_active: true,
      start_date: null,
      end_date: null,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setStartDateInput('');
    setEndDateInput('');
    setFormData({
      title: '',
      content: { time: Date.now(), blocks: [], version: '2.28.0' },
      link: '',
      link_label: '',
      gradient_theme: 'blue-green',
      icon: 'Lightbulb',
      order_index: 0,
      is_active: true,
      start_date: null,
      end_date: null,
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      setDialog({
        isOpen: true,
        type: 'validation',
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs obligatoires (titre et contenu).',
        isDangerous: false,
      });
      return;
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (startDate >= endDate) {
        setDialog({
          isOpen: true,
          type: 'validation',
          title: 'Dates invalides',
          message: 'La date de début doit être antérieure à la date de fin.',
          isDangerous: false,
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (isCreating) {
        const result = await createHighlight(formData as Omit<Highlight, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
        if (result.success) {
          handleCancel();
        } else {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la création de l\'information.',
            isDangerous: false,
          });
        }
      } else if (editingId) {
        const result = await updateHighlight(editingId, formData);
        if (result.success) {
          handleCancel();
        } else {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la mise à jour de l\'information.',
            isDangerous: false,
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'delete',
      title: 'Supprimer l\'information',
      message: 'Êtes-vous sûr de vouloir supprimer cette information ? Cette action est irréversible.',
      isDangerous: true,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        const result = await deleteHighlight(id);
        if (!result.success) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la suppression.',
            isDangerous: false,
          });
        } else {
          setDialog({ ...dialog, isOpen: false });
        }
      },
    });
  };

  const handleDuplicate = (highlight: Highlight) => {
    setDialog({
      isOpen: true,
      type: 'duplicate',
      title: 'Dupliquer l\'information',
      message: 'Voulez-vous dupliquer cette information ? Elle sera créée avec le statut désactivé et le titre "(copie)".',
      isDangerous: false,
      confirmText: 'Dupliquer',
      onConfirm: async () => {
        const duplicatedHighlight: Omit<Highlight, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> = {
          title: `${highlight.title} (copie)`,
          content: highlight.content,
          link: highlight.link,
          link_label: highlight.link_label,
          gradient_theme: highlight.gradient_theme,
          icon: highlight.icon,
          order_index: highlights.length,
          is_active: false,
          start_date: highlight.start_date,
          end_date: highlight.end_date,
        };

        const result = await createHighlight(duplicatedHighlight);
        if (!result.success) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la duplication.',
            isDangerous: false,
          });
        } else {
          setDialog({ ...dialog, isOpen: false });
          
          if (result.data) {
            const newHighlight: Highlight = {
              ...result.data,
              content: typeof result.data.content === 'string' ? JSON.parse(result.data.content) : result.data.content,
            };
            setEditingId(newHighlight.id);
            setFormData(newHighlight);
            setStartDateInput(newHighlight.start_date ? new Date(newHighlight.start_date).toLocaleDateString('fr-FR') : '');
            setEndDateInput(newHighlight.end_date ? new Date(newHighlight.end_date).toLocaleDateString('fr-FR') : '');
            setIsCreating(false);
            
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
          }
        }
      },
    });
  };

  const toggleActive = async (highlight: Highlight) => {
    await updateHighlight(highlight.id, { is_active: !highlight.is_active });
  };

  const formatDateInput = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length <= 2) {
      return digitsOnly;
    } else if (digitsOnly.length <= 4) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    } else {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    }
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche : Contenu */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">Contenu</h4>
              
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
            </div>

            {/* Colonne droite : Propriétés */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">Apparence et paramètres</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thème de couleur *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {GRADIENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, gradient_theme: theme.id })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.gradient_theme === theme.id
                          ? 'border-[#328fce] ring-2 ring-[#328fce] ring-opacity-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`h-10 rounded bg-gradient-to-r ${theme.colors} mb-2`}></div>
                      <p className="text-xs font-medium text-gray-700">{theme.name}</p>
                      <p className="text-xs text-gray-500">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icône *
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="jj/mm/aaaa"
                    value={startDateInput}
                    maxLength={10}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setStartDateInput(formatted);
                      
                      if (!formatted) {
                        setFormData({ ...formData, start_date: null });
                        return;
                      }
                      
                      const parts = formatted.split('/');
                      if (parts.length === 3 && parts[2].length === 4) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        
                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
                          const date = new Date(year, month - 1, day, 0, 0, 0);
                          if (!isNaN(date.getTime())) {
                            setFormData({ ...formData, start_date: date.toISOString() });
                          }
                        }
                      }
                    }}
                    onBlur={() => {
                      if (formData.start_date) {
                        setStartDateInput(new Date(formData.start_date).toLocaleDateString('fr-FR'));
                      } else if (startDateInput && !formData.start_date) {
                        setStartDateInput('');
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Affichée à partir de cette date
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="jj/mm/aaaa"
                    value={endDateInput}
                    maxLength={10}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setEndDateInput(formatted);
                      
                      if (!formatted) {
                        setFormData({ ...formData, end_date: null });
                        return;
                      }
                      
                      const parts = formatted.split('/');
                      if (parts.length === 3 && parts[2].length === 4) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        
                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
                          const date = new Date(year, month - 1, day, 23, 59, 59);
                          if (!isNaN(date.getTime())) {
                            setFormData({ ...formData, end_date: date.toISOString() });
                          }
                        }
                      }
                    }}
                    onBlur={() => {
                      if (formData.end_date) {
                        setEndDateInput(new Date(formData.end_date).toLocaleDateString('fr-FR'));
                      } else if (endDateInput && !formData.end_date) {
                        setEndDateInput('');
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ne sera plus affichée après
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
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
        <>
          {(() => {
            const now = new Date();
            const activeHighlights = highlights.filter(h => {
              const isActive = h.is_active;
              const isNotExpired = !h.end_date || new Date(h.end_date) > now;
              return isActive && isNotExpired;
            });
            const inactiveHighlights = highlights.filter(h => {
              const isActive = h.is_active;
              const isNotExpired = !h.end_date || new Date(h.end_date) > now;
              return !isActive || !isNotExpired;
            });

            return (
              <>
                {/* Highlights actifs */}
                {activeHighlights.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-green-700">Actifs</h3>
                      <span className="text-sm text-gray-600">({activeHighlights.length})</span>
                    </div>
                    {activeHighlights.map((highlight) => {
                      const globalIndex = highlights.findIndex(h => h.id === highlight.id);
                      const theme = GRADIENT_THEMES.find(t => t.id === highlight.gradient_theme);
                      const isDragging = draggedIndex === globalIndex;
                      const isDragOver = dragOverIndex === globalIndex;
                      
                      return (
                        <div
                          key={highlight.id}
                          draggable
                          onDragStart={() => handleDragStart(globalIndex)}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all border-green-200 ${
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
                          {highlight.start_date && (() => {
                            const startDate = new Date(highlight.start_date);
                            const isPast = startDate <= new Date();
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                {isPast ? 'Publié le' : 'Programmé pour le'} {startDate.toLocaleDateString('fr-FR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </p>
                            );
                          })()}
                          {highlight.end_date && (() => {
                            const endDate = new Date(highlight.end_date);
                            const isPast = endDate <= new Date();
                            return (
                              <p className="text-xs text-orange-600 mt-1">
                                {isPast ? 'Expiré le' : 'Expirera le'} {endDate.toLocaleDateString('fr-FR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </p>
                            );
                          })()}
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
                        onClick={() => handleDuplicate(highlight)}
                        className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        title="Dupliquer"
                      >
                        <Copy className="w-5 h-5" />
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

                {/* Highlights inactifs ou expirés */}
                {inactiveHighlights.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-500">Inactifs ou expirés</h3>
                      <span className="text-sm text-gray-600">({inactiveHighlights.length})</span>
                    </div>
                    {inactiveHighlights.map((highlight) => {
                      const globalIndex = highlights.findIndex(h => h.id === highlight.id);
                      const theme = GRADIENT_THEMES.find(t => t.id === highlight.gradient_theme);
                      const isDragging = draggedIndex === globalIndex;
                      const isDragOver = dragOverIndex === globalIndex;
                      const now = new Date();
                      const isExpired = highlight.end_date && new Date(highlight.end_date) <= now;
                      const isPending = highlight.start_date && new Date(highlight.start_date) > now;
                      
                      return (
                        <div
                          key={highlight.id}
                          draggable
                          onDragStart={() => handleDragStart(globalIndex)}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all border-gray-200 opacity-60 ${
                            isDragging ? 'opacity-30 scale-95' : ''
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
                                    {isPending && (
                                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                        Programmé
                                      </span>
                                    )}
                                    {isExpired && (
                                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                        Expiré
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
                                    {highlight.start_date && (() => {
                                      const startDate = new Date(highlight.start_date);
                                      const isPast = startDate <= new Date();
                                      return (
                                        <p className="text-xs text-green-600 mt-1">
                                          {isPast ? 'Publié le' : 'Programmé pour le'} {startDate.toLocaleDateString('fr-FR', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric'
                                          })}
                                        </p>
                                      );
                                    })()}
                                    {highlight.end_date && (() => {
                                      const endDate = new Date(highlight.end_date);
                                      const isPast = endDate <= new Date();
                                      return (
                                        <p className="text-xs text-orange-600 mt-1">
                                          {isPast ? 'Expiré le' : 'Expirera le'} {endDate.toLocaleDateString('fr-FR', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric'
                                          })}
                                        </p>
                                      );
                                    })()}
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
                                  onClick={() => handleDuplicate(highlight)}
                                  className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-5 h-5" />
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
              </>
            );
          })()}
        </>
      )}

      {highlights.filter(h => h.is_active).length > 3 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          ⚠️ Attention: Plus de 3 informations sont actives. Seules les 3 premières seront affichées sur la page d'accueil.
        </div>
      )}

      <ConfirmDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
          } else {
            setDialog({ ...dialog, isOpen: false });
          }
        }}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        isDangerous={dialog.isDangerous}
        isLoading={saving}
      />
    </div>
  );
}

