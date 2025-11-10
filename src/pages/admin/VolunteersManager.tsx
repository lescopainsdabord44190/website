import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import {
  HandHeart,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Shield,
  Building,
  Calendar,
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
import { useVolunteers, type Volunteer } from '../../hooks/useVolunteers';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ActionSplitButton } from '../../components/ActionSplitButton';

export function VolunteersManager() {
  const navigate = useNavigate();
  const {
    volunteers,
    loading,
    updateVolunteer,
    deleteVolunteer,
    reorderVolunteers,
    fetchVolunteersByStatus,
  } = useVolunteers();

  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const [archivedVolunteers, setArchivedVolunteers] = useState<Volunteer[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const [mobileActionsId, setMobileActionsId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeVolunteerOrder, setActiveVolunteerOrder] = useState<Volunteer[]>([]);

  useEffect(() => {
    setActiveVolunteerOrder(volunteers);
  }, [volunteers]);

  const loadArchivedVolunteers = useCallback(async () => {
    setArchivedLoading(true);
    const result = await fetchVolunteersByStatus(false);
    if (result.success) {
      setArchivedVolunteers(result.data);
      setArchivedLoaded(true);
    }
    setArchivedLoading(false);
  }, [fetchVolunteersByStatus]);

  const toggleArchivedSection = async () => {
    const nextValue = !archivedOpen;
    setArchivedOpen(nextValue);
    if (nextValue && !archivedLoaded && !archivedLoading) {
      await loadArchivedVolunteers();
    }
  };

  const activeCount = activeVolunteerOrder.length;
  const totalCount = useMemo(
    () => (archivedLoaded ? activeCount + archivedVolunteers.length : null),
    [activeCount, archivedVolunteers.length, archivedLoaded]
  );

  const handleToggleStatus = useCallback(
    async (volunteer: Volunteer) => {
      setMobileActionsId(null);
      const result = await updateVolunteer(volunteer.id, { is_active: !volunteer.is_active });
      if (result?.success && archivedLoaded) {
        await loadArchivedVolunteers();
      }
    },
    [archivedLoaded, loadArchivedVolunteers, updateVolunteer]
  );

  const handleActiveDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setMobileActionsId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const previousOrder = activeVolunteerOrder;
      const oldIndex = previousOrder.findIndex((item) => item.id === active.id);
      const newIndex = previousOrder.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = arrayMove(previousOrder, oldIndex, newIndex);
      setActiveVolunteerOrder(reordered);

      setIsReordering(true);
      const result = await reorderVolunteers(reordered);
      if (!result?.success) {
        setActiveVolunteerOrder(previousOrder);
      }
      setIsReordering(false);
    },
    [activeVolunteerOrder, reorderVolunteers]
  );

  const handleEdit = useCallback(
    (volunteer: Volunteer) => {
      setMobileActionsId(null);
      navigate(`/admin/volunteers/${volunteer.id}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback((volunteer: Volunteer) => {
    setMobileActionsId(null);
    setSelectedVolunteer(volunteer);
    setIsConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedVolunteer) return;
    setIsDeleting(true);
    const { success } = await deleteVolunteer(selectedVolunteer.id);
    if (!success) {
      setIsDeleting(false);
      return;
    }
    if (archivedLoaded) {
      await loadArchivedVolunteers();
    }
    setIsDeleting(false);
    setIsConfirmOpen(false);
    setSelectedVolunteer(null);
  }, [archivedLoaded, deleteVolunteer, loadArchivedVolunteers, selectedVolunteer]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
      </div>
    );
  }

  const hasActiveVolunteers = activeVolunteerOrder.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bénévoles</h2>
          <p className="text-gray-600">
            {activeCount} bénévoles actifs
            {archivedLoaded ? ` sur ${totalCount} enregistrés` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/volunteers/new')}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nouveau bénévole
        </button>
      </div>

      {!hasActiveVolunteers ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
          <p>Aucun bénévole n’a encore été enregistré.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleActiveDragEnd}>
          <SortableContext
            items={activeVolunteerOrder.map((volunteer) => volunteer.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {activeVolunteerOrder.map((volunteer) => (
                <SortableVolunteerCard
                  key={volunteer.id}
                  volunteer={volunteer}
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
            <span className="font-semibold text-gray-700">Bénévoles inactifs</span>
          </div>
          <span className="text-sm text-gray-500">{archivedLoaded ? archivedVolunteers.length : '—'}</span>
        </button>
        {archivedOpen && (
          <div className="px-6 pb-6 space-y-4">
            {archivedLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
              </div>
            ) : archivedVolunteers.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                Aucun bénévole inactif
              </div>
            ) : (
              archivedVolunteers.map((volunteer) => (
                <ArchivedVolunteerCard
                  key={volunteer.id}
                  volunteer={volunteer}
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
            setSelectedVolunteer(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Supprimer le bénévole"
        message={
          selectedVolunteer
            ? `Confirmez-vous la suppression de ${selectedVolunteer.first_name} ${selectedVolunteer.last_name || ''} ?`
            : ''
        }
        isDangerous
        isLoading={isDeleting}
        confirmText="Supprimer"
      />
    </div>
  );
}

interface SortableVolunteerCardProps {
  volunteer: Volunteer;
  isReordering: boolean;
  mobileActionsId: string | null;
  setMobileActionsId: (id: string | null) => void;
  onToggleStatus: (volunteer: Volunteer) => void | Promise<void>;
  onEdit: (volunteer: Volunteer) => void;
  onDelete: (volunteer: Volunteer) => void;
}

function SortableVolunteerCard({
  volunteer,
  isReordering,
  mobileActionsId,
  setMobileActionsId,
  onToggleStatus,
  onEdit,
  onDelete,
}: SortableVolunteerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: volunteer.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    boxShadow: isDragging ? '0 8px 22px rgba(50, 143, 206, 0.25)' : undefined,
  };

  const activeCommissions = volunteer.commissions
    .map((link) => link.commission)
    .filter((commission): commission is NonNullable<typeof commission> => Boolean(commission?.is_active));

  const isMobileMenuOpen = mobileActionsId === volunteer.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 space-y-4 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-grab"
            aria-label="Réorganiser le bénévole"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <VolunteerAvatar volunteer={volunteer} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-gray-800 truncate">
                  {volunteer.first_name} {volunteer.last_name || ''}
                </p>
                <VolunteerBadges volunteer={volunteer} />
              </div>
              {volunteer.role_title ? (
                <p className="text-sm text-[#328fce] truncate">{volunteer.role_title}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Rôle à compléter</p>
              )}
              {volunteer.mandate_start_date && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Mandat depuis le{' '}
                    {new Date(volunteer.mandate_start_date).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              )}
              {activeCommissions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {activeCommissions.map((commission) => (
                    <span
                      key={commission.id}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                    >
                      <HandHeart className="w-3 h-3" />
                      {commission.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <ActionSplitButton
            primaryLabel="Modifier"
            primaryIcon={<Edit className="w-4 h-4" />}
            onPrimaryClick={() => onEdit(volunteer)}
            disabled={isReordering}
            menuActions={[
              {
                label: 'Désactiver',
                icon: <UserX className="w-4 h-4" />,
                onClick: () => onToggleStatus(volunteer),
                className:
                  'hover:bg-yellow-50 text-yellow-700 focus-visible:ring-yellow-500/50',
                disabled: isReordering,
              },
              {
                label: 'Supprimer',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => onDelete(volunteer),
                className: 'hover:bg-red-50 text-red-600 focus-visible:ring-red-500/50',
                disabled: isReordering,
              },
            ]}
          />
        </div>

        <div className="relative sm:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileActionsId(isMobileMenuOpen ? null : volunteer.id)}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-10">
              <button
                type="button"
                onClick={() => onToggleStatus(volunteer)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-yellow-50 text-yellow-700"
              >
                Désactiver
              </button>
              <button
                type="button"
                onClick={() => onEdit(volunteer)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDelete(volunteer)}
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

interface ArchivedVolunteerCardProps {
  volunteer: Volunteer;
  mobileActionsId: string | null;
  setMobileActionsId: (id: string | null) => void;
  onToggleStatus: (volunteer: Volunteer) => void | Promise<void>;
  onEdit: (volunteer: Volunteer) => void;
  onDelete: (volunteer: Volunteer) => void;
}

function ArchivedVolunteerCard({
  volunteer,
  mobileActionsId,
  setMobileActionsId,
  onToggleStatus,
  onEdit,
  onDelete,
}: ArchivedVolunteerCardProps) {
  const isMobileMenuOpen = mobileActionsId === volunteer.id;

  return (
    <div className="opacity-60 bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <VolunteerAvatar volunteer={volunteer} />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-gray-800 truncate">
                {volunteer.first_name} {volunteer.last_name || ''}
              </p>
              <VolunteerBadges volunteer={volunteer} />
            </div>
            {volunteer.role_title && <p className="text-sm text-[#328fce] truncate">{volunteer.role_title}</p>}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <ActionSplitButton
            primaryLabel="Modifier"
            primaryIcon={<Edit className="w-4 h-4" />}
            onPrimaryClick={() => onEdit(volunteer)}
            menuActions={[
              {
                label: 'Activer',
                icon: <UserCheck className="w-4 h-4" />,
                onClick: () => onToggleStatus(volunteer),
                className:
                  'hover:bg-green-50 text-green-700 focus-visible:ring-green-500/50',
              },
              {
                label: 'Supprimer',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => onDelete(volunteer),
                className: 'hover:bg-red-50 text-red-600 focus-visible:ring-red-500/50',
              },
            ]}
          />
        </div>

        <div className="relative sm:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileActionsId(isMobileMenuOpen ? null : volunteer.id)}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-10">
              <button
                type="button"
                onClick={() => onToggleStatus(volunteer)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-green-50 text-green-700"
              >
                Activer
              </button>
              <button
                type="button"
                onClick={() => onEdit(volunteer)}
                className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onDelete(volunteer)}
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

function VolunteerAvatar({ volunteer }: { volunteer: Volunteer }) {
  if (volunteer.photo_url) {
    return (
      <img
        src={volunteer.photo_url}
        alt={`${volunteer.first_name} ${volunteer.last_name || ''}`}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  const initials =
    `${volunteer.first_name?.[0] ?? ''}${volunteer.last_name?.[0] ?? ''}`.trim().toUpperCase() || '–';

  return (
    <div className="w-12 h-12 rounded-full bg-[#328fce]/10 text-[#328fce] flex items-center justify-center font-semibold text-lg shadow-sm">
      {initials}
    </div>
  );
}

function VolunteerBadges({ volunteer }: { volunteer: Volunteer }) {
  const badges = [];

  if (volunteer.is_executive_member) {
    badges.push(
      <span
        key="executive"
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 text-purple-700"
      >
        <Shield className="w-3 h-3" />
        Bureau
      </span>
    );
  }

  if (volunteer.is_board_member) {
    badges.push(
      <span
        key="board"
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700"
      >
        <Building className="w-3 h-3" />
        CA
      </span>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return <div className="flex items-center flex-wrap gap-1">{badges}</div>;
}

