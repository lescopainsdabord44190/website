import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useCommissions, type Commission } from '../../hooks/useCommissions';
import { ActionSplitButton } from '../../components/ActionSplitButton';

export function CommissionsManager() {
  const navigate = useNavigate();
  const {
    commissions,
    loading,
    updateCommission,
    deleteCommission,
    reorderCommissions,
    fetchCommissionsByStatus,
  } = useCommissions();

  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [archivedCommissions, setArchivedCommissions] = useState<Commission[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeCommissionOrder, setActiveCommissionOrder] = useState<Commission[]>(commissions);

  useEffect(() => {
    setActiveCommissionOrder(commissions);
  }, [commissions]);

  const loadArchivedCommissions = useCallback(async () => {
    setArchivedLoading(true);
    const result = await fetchCommissionsByStatus(false);
    if (result.success) {
      setArchivedCommissions(result.data);
      setArchivedLoaded(true);
    }
    setArchivedLoading(false);
  }, [fetchCommissionsByStatus]);

  const toggleArchivedSection = async () => {
    const nextValue = !archivedOpen;
    setArchivedOpen(nextValue);
    if (nextValue && !archivedLoaded && !archivedLoading) {
      await loadArchivedCommissions();
    }
  };

  const handleToggleActive = async (commission: Commission) => {
    const result = await updateCommission(commission.id, { is_active: !commission.is_active });
    if (result?.success && archivedLoaded) {
      await loadArchivedCommissions();
    }
  };

  const handleDelete = (commission: Commission) => {
    setSelectedCommission(commission);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCommission) return;
    setIsDeleting(true);
    const { success } = await deleteCommission(selectedCommission.id);
    if (!success) {
      setIsDeleting(false);
      return;
    }
    if (archivedLoaded) {
      await loadArchivedCommissions();
    }
    setIsDeleting(false);
    setIsConfirmOpen(false);
    setSelectedCommission(null);
  };

  const handleActiveDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const previousOrder = activeCommissionOrder;
    const oldIndex = previousOrder.findIndex((item) => item.id === active.id);
    const newIndex = previousOrder.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(previousOrder, oldIndex, newIndex);
    setActiveCommissionOrder(reordered);

    setIsReordering(true);
    const result = await reorderCommissions(reordered);
    if (!result?.success) {
      setActiveCommissionOrder(previousOrder);
    }
    setIsReordering(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Commissions</h2>
          <p className="text-gray-600">
            Organisez les commissions thématiques et associez-les aux bénévoles référents.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/commissions/new')}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nouvelle commission
        </button>
      </div>

      {activeCommissionOrder.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Aucune commission active pour l’instant.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleActiveDragEnd}>
          <SortableContext
            items={activeCommissionOrder.map((commission) => commission.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {activeCommissionOrder.map((commission) => (
                <SortableCommissionCard
                  key={commission.id}
                  commission={commission}
                  isReordering={isReordering}
                  onToggleActive={handleToggleActive}
                  onEdit={() => navigate(`/admin/commissions/${commission.id}/edit`)}
                  onDelete={() => handleDelete(commission)}
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
            <span className="font-semibold text-gray-700">Commissions inactives</span>
          </div>
          <span className="text-sm text-gray-500">{archivedLoaded ? archivedCommissions.length : '—'}</span>
        </button>
        {archivedOpen && (
          <div className="px-6 pb-6 space-y-4">
            {archivedLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
              </div>
            ) : archivedCommissions.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4">
                Aucune commission inactive
              </div>
            ) : (
              archivedCommissions.map((commission) => (
                <ArchivedCommissionCard
                  key={commission.id}
                  commission={commission}
                  onToggleActive={handleToggleActive}
                  onEdit={() => navigate(`/admin/commissions/${commission.id}/edit`)}
                  onDelete={() => handleDelete(commission)}
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
            setSelectedCommission(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Supprimer la commission"
        message={
          selectedCommission
            ? `Confirmez-vous la suppression de la commission « ${selectedCommission.title} » ?`
            : ''
        }
        isDangerous
        isLoading={isDeleting}
        confirmText="Supprimer"
      />
    </div>
  );
}

interface SortableCommissionCardProps {
  commission: Commission;
  isReordering: boolean;
  onToggleActive: (commission: Commission) => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableCommissionCard({
  commission,
  isReordering,
  onToggleActive,
  onEdit,
  onDelete,
}: SortableCommissionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: commission.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    boxShadow: isDragging ? '0 8px 22px rgba(50, 143, 206, 0.25)' : undefined,
  };

  const activeVolunteers = commission.volunteers
    .map((link) => link.volunteer)
    .filter((volunteer): volunteer is NonNullable<typeof volunteer> => Boolean(volunteer?.is_active));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-green-100"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-grab"
            aria-label="Réorganiser la commission"
            {...attributes}
            {...listeners}
          >
            <Layers className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-semibold text-gray-800">{commission.title}</h3>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
            Actif
          </span>
        </div>
        {commission.description && <p className="text-gray-600 mt-2">{commission.description}</p>}
        {activeVolunteers.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4" />
              <span>Bénévoles actifs ({activeVolunteers.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeVolunteers.map((volunteer) => (
                <span
                  key={volunteer.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  {volunteer.first_name} {volunteer.last_name || ''}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-3">Aucun bénévole actif associé.</p>
        )}
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto">
        <ActionSplitButton
          primaryLabel="Modifier"
          primaryIcon={<Edit className="w-4 h-4" />}
          onPrimaryClick={onEdit}
          disabled={isReordering}
          menuActions={[
            {
              label: commission.is_active ? 'Archiver' : 'Activer',
              icon: commission.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />,
              onClick: () => onToggleActive(commission),
              className: commission.is_active
                ? 'hover:bg-yellow-50 text-yellow-700 focus-visible:ring-yellow-500/50'
                : 'hover:bg-green-50 text-green-700 focus-visible:ring-green-500/50',
              disabled: isReordering,
            },
            {
              label: 'Supprimer',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: onDelete,
              className: 'hover:bg-red-50 text-red-600 focus-visible:ring-red-500/50',
              disabled: isReordering,
            },
          ]}
        />
      </div>
    </div>
  );
}

interface ArchivedCommissionCardProps {
  commission: Commission;
  onToggleActive: (commission: Commission) => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

function ArchivedCommissionCard({ commission, onToggleActive, onEdit, onDelete }: ArchivedCommissionCardProps) {
  const inactiveVolunteers = commission.volunteers
    .map((link) => link.volunteer)
    .filter((volunteer): volunteer is NonNullable<typeof volunteer> => Boolean(volunteer));

  return (
    <div className="opacity-60 bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-800">{commission.title}</h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-600">Inactif</span>
      </div>
      {commission.description && <p className="text-gray-600 text-sm">{commission.description}</p>}
      {inactiveVolunteers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            Liens ({inactiveVolunteers.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {inactiveVolunteers.map((volunteer) => (
              <span
                key={volunteer.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {volunteer.first_name} {volunteer.last_name || ''}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <ActionSplitButton
          primaryLabel="Modifier"
          primaryIcon={<Edit className="w-4 h-4" />}
          onPrimaryClick={onEdit}
          menuActions={[
            {
              label: 'Activer',
              icon: <ToggleRight className="w-4 h-4" />,
              onClick: () => onToggleActive(commission),
              className: 'hover:bg-green-50 text-green-700 focus-visible:ring-green-500/50',
            },
            {
              label: 'Supprimer',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: onDelete,
              className: 'hover:bg-red-50 text-red-600 focus-visible:ring-red-500/50',
            },
          ]}
        />
      </div>
    </div>
  );
}


