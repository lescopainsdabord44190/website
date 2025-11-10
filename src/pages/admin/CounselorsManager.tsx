import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
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
import { useCounselors, type Counselor } from '../../hooks/useCounselors';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function CounselorsManager() {
  const navigate = useNavigate();
  const {
    counselors,
    loading,
    updateCounselor,
    deleteCounselor,
    reorderCounselors,
    fetchCounselorsByStatus,
  } = useCounselors();

  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const [archivedCounselors, setArchivedCounselors] = useState<Counselor[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const [mobileActionsId, setMobileActionsId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeCounselorOrder, setActiveCounselorOrder] = useState<Counselor[]>([]);

  useEffect(() => {
    setActiveCounselorOrder(counselors);
  }, [counselors]);

  const loadArchivedCounselors = useCallback(async () => {
    setArchivedLoading(true);
    const result = await fetchCounselorsByStatus(false);
    if (result.success) {
      setArchivedCounselors(result.data);
      setArchivedLoaded(true);
    }
    setArchivedLoading(false);
  }, [fetchCounselorsByStatus]);

  const toggleArchivedSection = async () => {
    const nextValue = !archivedOpen;
    setArchivedOpen(nextValue);
    if (nextValue && !archivedLoaded && !archivedLoading) {
      await loadArchivedCounselors();
    }
  };

  const activeCount = activeCounselorOrder.length;
  const totalCount = useMemo(
    () => (archivedLoaded ? activeCount + archivedCounselors.length : null),
    [activeCount, archivedCounselors.length, archivedLoaded]
  );

  const handleToggleStatus = useCallback(
    async (counselor: Counselor) => {
      setMobileActionsId(null);
      const result = await updateCounselor(counselor.id, { is_active: !counselor.is_active });
      if (result?.success && archivedLoaded) {
        await loadArchivedCounselors();
      }
    },
    [archivedLoaded, loadArchivedCounselors, updateCounselor]
  );

  const handleActiveDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setMobileActionsId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const previousOrder = activeCounselorOrder;
      const oldIndex = previousOrder.findIndex((item) => item.id === active.id);
      const newIndex = previousOrder.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = arrayMove(previousOrder, oldIndex, newIndex);
      setActiveCounselorOrder(reordered);

      setIsReordering(true);
      const result = await reorderCounselors(reordered);
      if (!result?.success) {
        setActiveCounselorOrder(previousOrder);
      }
      setIsReordering(false);
    },
    [activeCounselorOrder, reorderCounselors]
  );

  const handleEdit = useCallback(
    (counselor: Counselor) => {
      setMobileActionsId(null);
      navigate(`/admin/anims/${counselor.id}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback((counselor: Counselor) => {
    setMobileActionsId(null);
    setSelectedCounselor(counselor);
    setIsConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedCounselor) return;
    setIsDeleting(true);
    const { success } = await deleteCounselor(selectedCounselor.id);
    if (!success) {
      setIsDeleting(false);
      return;
    }
    if (archivedLoaded) {
      await loadArchivedCounselors();
    }
    setIsDeleting(false);
    setIsConfirmOpen(false);
    setSelectedCounselor(null);
  }, [archivedLoaded, deleteCounselor, loadArchivedCounselors, selectedCounselor]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
      </div>
    );
  }

  const hasActiveCounselors = activeCounselorOrder.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Équipe d’animation</h2>
          <p className="text-gray-600">
            {activeCount} animateur·rices actifs
            {archivedLoaded ? ` sur ${totalCount} enregistrés` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/anims/new')}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nouvel animateur
        </button>
      </div>

      {!hasActiveCounselors ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
          <p>Aucun animateur n’a encore été enregistré.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleActiveDragEnd}
        >
          <SortableContext
            items={activeCounselorOrder.map((counselor) => counselor.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {activeCounselorOrder.map((counselor) => (
                <SortableCounselorCard
                  key={counselor.id}
                  counselor={counselor}
                  isReordering={isReordering}
                  mobileActionsId={mobileActionsId}
                  setMobileActionsId={setMobileActionsId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
            <span className="font-semibold text-gray-700">Anims désactivés</span>
          </div>
          <span className="text-sm text-gray-500">
            {archivedLoaded ? archivedCounselors.length : '—'}
          </span>
        </button>
        {archivedOpen && (
          <div className="px-6 pb-6 space-y-4">
            {archivedLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
              </div>
            ) : archivedCounselors.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                Aucun animateur désactivé
              </div>
            ) : (
              archivedCounselors.map((counselor) => (
                <ArchivedCounselorCard
                  key={counselor.id}
                  counselor={counselor}
                  mobileActionsId={mobileActionsId}
                  setMobileActionsId={setMobileActionsId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsConfirmOpen(false);
            setSelectedCounselor(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Supprimer l’animateur·rice"
        message={
          selectedCounselor
            ? `Confirmez-vous la suppression de ${selectedCounselor.first_name} ${selectedCounselor.last_name || ''} ?`
            : ''
        }
        isDangerous
        isLoading={isDeleting}
        confirmText="Supprimer"
      />
    </div>
  );
}

interface SortableCounselorCardProps {
  counselor: Counselor;
  isReordering: boolean;
  mobileActionsId: string | null;
  setMobileActionsId: (id: string | null) => void;
  onToggleStatus: (counselor: Counselor) => void | Promise<void>;
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselor: Counselor) => void;
}

function SortableCounselorCard({
  counselor,
  isReordering,
  mobileActionsId,
  setMobileActionsId,
  onToggleStatus,
  onEdit,
  onDelete,
}: SortableCounselorCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: counselor.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    boxShadow: isDragging ? '0 8px 22px rgba(50, 143, 206, 0.25)' : undefined,
  };

  const activeProjects =
    counselor.projects
      ?.map((link) => link.project)
      .filter((project): project is NonNullable<(typeof counselor.projects)[number]['project']> =>
        Boolean(project?.is_active)
      ) ?? [];

  const isMobileMenuOpen = mobileActionsId === counselor.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 space-y-4 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-grab"
            aria-label="Réorganiser l’animateur·rice"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <CounselorAvatar counselor={counselor} />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-800 truncate">
                {counselor.first_name} {counselor.last_name || ''}
              </p>
              {counselor.role_title ? (
                <p className="text-sm text-[#328fce] truncate">{counselor.role_title}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Fonction à compléter</p>
              )}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggleStatus(counselor)}
            disabled={isReordering}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <UserX className="w-4 h-4" />
            <span className="text-sm font-medium">Désactiver</span>
          </button>
          <button
            onClick={() => onEdit(counselor)}
            disabled={isReordering}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">Modifier</span>
          </button>
          <button
            onClick={() => onDelete(counselor)}
            disabled={isReordering}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Supprimer</span>
          </button>
        </div>

        <div className="relative sm:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileActionsId(isMobileMenuOpen ? null : counselor.id)}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-10">
              <button
                type="button"
                onClick={() => onToggleStatus(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-yellow-50 text-yellow-700"
              >
                Désactiver
              </button>
              <button
                type="button"
                onClick={() => onEdit(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDelete(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-red-50 text-red-600"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ArchivedCounselorCardProps {
  counselor: Counselor;
  mobileActionsId: string | null;
  setMobileActionsId: (id: string | null) => void;
  onToggleStatus: (counselor: Counselor) => void | Promise<void>;
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselor: Counselor) => void;
}

function ArchivedCounselorCard({
  counselor,
  mobileActionsId,
  setMobileActionsId,
  onToggleStatus,
  onEdit,
  onDelete,
}: ArchivedCounselorCardProps) {
  const activeProjects =
    counselor.projects
      ?.map((link) => link.project)
      .filter((project): project is NonNullable<(typeof counselor.projects)[number]['project']> =>
        Boolean(project?.is_active)
      ) ?? [];

  const isMobileMenuOpen = mobileActionsId === counselor.id;

  return (
    <div className="opacity-60 bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <CounselorAvatar counselor={counselor} />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-800 truncate">
              {counselor.first_name} {counselor.last_name || ''}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggleStatus(counselor)}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            type="button"
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Activer</span>
          </button>
          <button
            onClick={() => onEdit(counselor)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            type="button"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">Modifier</span>
          </button>
          <button
            onClick={() => onDelete(counselor)}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Supprimer</span>
          </button>
        </div>

        <div className="relative sm:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileActionsId(isMobileMenuOpen ? null : counselor.id)}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-10">
              <button
                type="button"
                onClick={() => onToggleStatus(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-green-50 text-green-700"
              >
                Activer
              </button>
              <button
                type="button"
                onClick={() => onEdit(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDelete(counselor)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-red-50 text-red-600"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>



      
    </div>
  );
}

function CounselorAvatar({ counselor }: { counselor: Counselor }) {
  if (counselor.photo_url) {
    return (
      <img
        src={counselor.photo_url}
        alt={`${counselor.first_name} ${counselor.last_name || ''}`}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  const initials =
    `${counselor.first_name?.[0] ?? ''}${counselor.last_name?.[0] ?? ''}`.trim().toUpperCase() || '–';

  return (
    <div className="w-12 h-12 rounded-full bg-[#328fce]/10 text-[#328fce] flex items-center justify-center font-semibold text-lg shadow-sm">
      {initials}
    </div>
  );
}


