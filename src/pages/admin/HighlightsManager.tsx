import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { useHighlights, Highlight } from '../../hooks/useHighlights';
import { Plus, Edit, Trash2, GripVertical, Save, X, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OutputData } from '@editorjs/editorjs';
import * as LucideIcons from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const {
    highlights: activeHighlights,
    loading,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    reorderHighlights,
    fetchHighlightsByStatus,
  } = useHighlights({ status: 'active' });
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
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  const [archivedHighlights, setArchivedHighlights] = useState<Highlight[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [activeHighlightsOrder, setActiveHighlightsOrder] = useState<Highlight[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  
  const now = new Date();
  const expiredHighlights = activeHighlightsOrder.filter(
    (highlight) => highlight.end_date && new Date(highlight.end_date) <= now
  );
  const visibleActiveHighlights = activeHighlightsOrder.filter(
    (highlight) => !highlight.end_date || new Date(highlight.end_date) > now
  );
  const totalHighlightsCount = activeHighlightsOrder.length + archivedHighlights.length;
  
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

  const loadArchivedHighlights = useCallback(async () => {
    setArchivedLoading(true);
    const result = await fetchHighlightsByStatus(false);
    if (result.success) {
      setArchivedHighlights(result.data);
      setArchivedLoaded(true);
    }
    setArchivedLoading(false);
  }, [fetchHighlightsByStatus]);

  const toggleArchivedSection = async () => {
    const nextValue = !archivedOpen;
    setArchivedOpen(nextValue);
    if (nextValue && !archivedLoaded && !archivedLoading) {
      await loadArchivedHighlights();
    }
  };

  useEffect(() => {
    setActiveHighlightsOrder(activeHighlights);
  }, [activeHighlights]);

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
      order_index: totalHighlightsCount,
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
          if (archivedLoaded) {
            await loadArchivedHighlights();
          }
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
          order_index: totalHighlightsCount,
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
          
          if (archivedLoaded) {
            await loadArchivedHighlights();
          }
        }
      },
    });
  };

  const handleActiveDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const now = new Date();
    const visibleIds = activeHighlightsOrder
      .filter((highlight) => !highlight.end_date || new Date(highlight.end_date) > now)
      .map((highlight) => highlight.id);

    const activeIndexVisible = visibleIds.indexOf(String(active.id));
    const overIndexVisible = visibleIds.indexOf(String(over.id));

    if (activeIndexVisible === -1 || overIndexVisible === -1) {
      return;
    }

    const previousOrder = activeHighlightsOrder.slice();
    const fromId = visibleIds[activeIndexVisible];
    const toId = visibleIds[overIndexVisible];
    const fromIndex = previousOrder.findIndex((item) => item.id === fromId);
    const toIndex = previousOrder.findIndex((item) => item.id === toId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const reordered = arrayMove(previousOrder, fromIndex, toIndex);
    setActiveHighlightsOrder(reordered);

    setIsReordering(true);
    const result = await reorderHighlights(reordered);
    if (!result?.success) {
      setActiveHighlightsOrder(previousOrder);
    }
    setIsReordering(false);
  };

  const toggleActive = async (highlight: Highlight) => {
    const result = await updateHighlight(highlight.id, { is_active: !highlight.is_active });
    if (result?.success && archivedLoaded) {
      await loadArchivedHighlights();
    }
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
            disabled={visibleActiveHighlights.length >= 3}
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

      {(() => {
          const combinedArchivedHighlights = archivedLoaded
            ? [
                ...expiredHighlights,
                ...archivedHighlights.filter(
                  (archivedHighlight) =>
                    !expiredHighlights.some(
                      (expiredHighlight) => expiredHighlight.id === archivedHighlight.id
                    )
                ),
              ]
            : expiredHighlights;

          return (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-green-700">Actifs</h3>
                  <span className="text-sm text-gray-600">({visibleActiveHighlights.length})</span>
                </div>
                {visibleActiveHighlights.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Aucune information à afficher</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Cliquez sur "Nouvelle information" pour commencer
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleActiveDragEnd}
                  >
                    <SortableContext
                      items={visibleActiveHighlights.map((highlight) => highlight.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {visibleActiveHighlights.map((highlight) => (
                          <SortableHighlightCard
                            key={highlight.id}
                            highlight={highlight}
                            renderIcon={renderIcon}
                            onToggle={toggleActive}
                            onEdit={handleEdit}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            isReordering={isReordering}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={toggleArchivedSection}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {archivedOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700">Inactifs ou expirés</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {archivedLoaded ? combinedArchivedHighlights.length : expiredHighlights.length}
                  </span>
                </button>
                {archivedOpen && (
                  <div className="px-6 pb-6 space-y-4">
                    {archivedLoading && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
                      </div>
                    )}
                    {combinedArchivedHighlights.length === 0 ? (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                        Aucune information archivée
                      </div>
                    ) : (
                      combinedArchivedHighlights.map((highlight) => (
                        <ArchivedHighlightCard
                          key={highlight.id}
                          highlight={highlight}
                          renderIcon={renderIcon}
                          onToggle={toggleActive}
                          onEdit={handleEdit}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {visibleActiveHighlights.length > 3 && (
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

interface SortableHighlightCardProps {
  highlight: Highlight;
  renderIcon: (iconName: string) => ReactNode;
  onToggle: (highlight: Highlight) => void | Promise<void>;
  onEdit: (highlight: Highlight) => void;
  onDuplicate: (highlight: Highlight) => void;
  onDelete: (id: string) => void;
  isReordering: boolean;
}

function SortableHighlightCard({
  highlight,
  renderIcon,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  isReordering,
}: SortableHighlightCardProps) {
  const theme = GRADIENT_THEMES.find((t) => t.id === highlight.gradient_theme);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: highlight.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    boxShadow: isDragging ? '0 8px 22px rgba(50, 143, 206, 0.25)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-green-200 transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <button
              type="button"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 cursor-grab mt-1 transition-colors"
              aria-label="Réorganiser l'information"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5" />
            </button>

            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-r ${theme?.colors} flex items-center justify-center text-white flex-shrink-0`}
            >
              {renderIcon(highlight.icon)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-800 truncate">{highlight.title}</h3>
                {theme && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {theme.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {highlight.link && (
                  <>
                    <p className="truncate">Lien: {highlight.link}</p>
                    {highlight.link_label && (
                      <p className="text-xs text-blue-600">{`Bouton: ${highlight.link_label}`}</p>
                    )}
                  </>
                )}
                {highlight.start_date && (
                  <p className="text-xs text-green-600">
                    {(new Date(highlight.start_date) <= new Date() ? 'Publié le ' : 'Programmé pour le ') +
                      new Date(highlight.start_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                  </p>
                )}
                {highlight.end_date && (
                  <p className="text-xs text-orange-600">
                    {(new Date(highlight.end_date) <= new Date() ? 'Expiré le ' : 'Expirera le ') +
                      new Date(highlight.end_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(highlight)}
              disabled={isReordering}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                highlight.is_active ? 'bg-[#328fce]' : 'bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={highlight.is_active ? 'Désactiver' : 'Activer'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  highlight.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <button
              onClick={() => onEdit(highlight)}
              disabled={isReordering}
              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Modifier"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDuplicate(highlight)}
              disabled={isReordering}
              className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Dupliquer"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(highlight.id)}
              disabled={isReordering}
              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ArchivedHighlightCardProps {
  highlight: Highlight;
  renderIcon: (iconName: string) => ReactNode;
  onToggle: (highlight: Highlight) => void | Promise<void>;
  onEdit: (highlight: Highlight) => void;
  onDuplicate: (highlight: Highlight) => void;
  onDelete: (id: string) => void;
}

function ArchivedHighlightCard({
  highlight,
  renderIcon,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: ArchivedHighlightCardProps) {
  const theme = GRADIENT_THEMES.find((t) => t.id === highlight.gradient_theme);
  const now = new Date();
  const isExpired = highlight.end_date && new Date(highlight.end_date) <= now;
  const isPending = highlight.start_date && new Date(highlight.start_date) > now;

  return (
    <div className="opacity-60 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-r ${theme?.colors} flex items-center justify-center text-white flex-shrink-0`}
            >
              {renderIcon(highlight.icon)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-800 truncate">{highlight.title}</h3>
                {!highlight.is_active && (
                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">Inactif</span>
                )}
                {isPending && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Programmé</span>
                )}
                {isExpired && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Expiré</span>
                )}
                {theme && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{theme.name}</span>
                )}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {highlight.link && (
                  <>
                    <p className="truncate">Lien: {highlight.link}</p>
                    {highlight.link_label && (
                      <p className="text-xs text-blue-600">{`Bouton: ${highlight.link_label}`}</p>
                    )}
                  </>
                )}
                {highlight.start_date && (
                  <p className="text-xs text-green-600">
                    {(new Date(highlight.start_date) <= now ? 'Publié le ' : 'Programmé pour le ') +
                      new Date(highlight.start_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                  </p>
                )}
                {highlight.end_date && (
                  <p className="text-xs text-orange-600">
                    {(new Date(highlight.end_date) <= now ? 'Expiré le ' : 'Expirera le ') +
                      new Date(highlight.end_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(highlight)}
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
              onClick={() => onEdit(highlight)}
              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="Modifier"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDuplicate(highlight)}
              className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              title="Dupliquer"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(highlight.id)}
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
}
