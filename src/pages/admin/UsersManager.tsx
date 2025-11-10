import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield,
  UserPlus,
  Edit,
  Power,
  ShieldOff,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Mail,
  PenSquare,
} from 'lucide-react';
import { useAdminUsers, type AdminUser } from '../../hooks/useAdminUsers';
import type { UserRole } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ActionSplitButton, type SplitButtonAction } from '../../components/ActionSplitButton';

function UserAvatar({ user }: { user: AdminUser }) {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const altText = displayName || user.email || 'Utilisateur';

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={altText}
        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  const initials =
    ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).trim() ||
    (user.email?.[0]?.toUpperCase() ?? '–');

  return (
    <div className="w-12 h-12 rounded-full bg-[#328fce]/10 text-[#328fce] flex items-center justify-center font-semibold text-lg shadow-sm">
      {initials}
    </div>
  );
}

interface PaginationProps {
  current: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

function PaginationControls({ current, total, perPage, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-3 pt-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current <= 1}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Précédent
      </button>
      <span className="text-sm text-gray-500">
        Page {current} sur {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, current + 1))}
        disabled={current >= totalPages}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Suivant
      </button>
    </div>
  );
}

interface UserCardProps {
  user: AdminUser;
  pending: boolean;
  onToggleAdmin: (user: AdminUser) => void;
  onToggleEditor: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onResend: (user: AdminUser) => void;
  onEdit: (user: AdminUser) => void;
}

function UserCard({
  user,
  pending,
  onToggleAdmin,
  onToggleEditor,
  onToggleActive,
  onDelete,
  onResend,
  onEdit,
}: UserCardProps) {
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || 'Utilisateur';

  const activeMenuActions: SplitButtonAction[] = [
    {
      label: user.is_admin ? 'Retirer admin' : 'Donner admin',
      icon: user.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />,
      onClick: () => onToggleAdmin(user),
      className: 'hover:bg-yellow-50 text-yellow-700 focus-visible:ring-yellow-500/50',
      disabled: pending,
    },
    {
      label: user.is_editor ? 'Retirer éditeur' : 'Donner éditeur',
      icon: <PenSquare className="w-4 h-4" />,
      onClick: () => onToggleEditor(user),
      className: 'hover:bg-blue-50 text-blue-700 focus-visible:ring-blue-500/50',
      disabled: pending,
    },
    {
      label: 'Désactiver',
      icon: <Power className="w-4 h-4" />,
      onClick: () => onToggleActive(user),
      className: 'hover:bg-red-50 text-red-600 focus-visible:ring-red-500/50',
      disabled: pending,
    },
  ];

  return (
    <div className="relative bg-white rounded-2xl shadow-lg border border-blue-100 p-6 space-y-4 transition-all overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-800 truncate">{displayName}</p>
              <div className="flex items-center gap-2">
                {user.is_admin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[#328fce]/10 text-[#328fce]">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
                {user.is_editor && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    <PenSquare className="w-3 h-3" />
                    Éditeur
                  </span>
                )}
              </div>
            </div>
            {user.email && <p className="text-sm text-gray-500 truncate">{user.email}</p>}
          </div>
        </div>

        {user.is_active ? (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <ActionSplitButton
                primaryLabel="Modifier"
                primaryIcon={<Edit className="w-4 h-4" />}
                onPrimaryClick={() => onEdit(user)}
                disabled={pending}
                menuActions={activeMenuActions}
              />
            </div>

            <div className="relative sm:hidden flex-shrink-0">
              <details className="group">
                <summary className="list-none">
                  <button
                    type="button"
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={pending}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </summary>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-30">
                  <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
                    disabled={pending}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleAdmin(user)}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-yellow-50 text-yellow-700"
                    disabled={pending}
                  >
                    {user.is_admin ? 'Retirer admin' : 'Donner admin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleEditor(user)}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-blue-50 text-blue-700"
                    disabled={pending}
                  >
                    {user.is_editor ? 'Retirer éditeur' : 'Donner éditeur'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(user)}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-red-50 text-red-600"
                    disabled={pending}
                  >
                    Désactiver
                  </button>
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleActive(user)}
              disabled={pending}
              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Réactiver"
            >
              <Power className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onResend(user)}
              disabled={pending}
              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Renvoyer l’invitation"
            >
              <Mail className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(user)}
              disabled={pending}
              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Supprimer définitivement"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface InviteUserFormState {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  isEditor: boolean;
}

export function UsersManager() {
  const navigate = useNavigate();
  const {
    activeUsers,
    inactiveUsers,
    activePagination,
    inactivePagination,
    loadingActive,
    loadingInactive,
    error,
    fetchUsers,
    inviteUser,
    toggleActiveStatus,
    updateUserRole,
    deleteUser,
    resendInvitation,
  } = useAdminUsers();

  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteUserFormState>({
    firstName: '',
    lastName: '',
    email: '',
    isAdmin: false,
    isEditor: false,
  });
  const [pendingUsers, setPendingUsers] = useState<Record<string, boolean>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    user: AdminUser | null;
    targetStatus: boolean | null;
  }>({ user: null, targetStatus: null });
  const [roleError, setRoleError] = useState<string | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const totalActive = activePagination.total;
  const totalInactive = inactivePagination.total;

  useEffect(() => {
    fetchUsers({ status: 'active', page: activePage });
  }, [activePage, fetchUsers]);

  useEffect(() => {
    if (archivedOpen) {
      fetchUsers({ status: 'inactive', page: inactivePage });
    }
  }, [archivedOpen, inactivePage, fetchUsers]);

  const handleToggleRole = async (user: AdminUser, role: UserRole, enable: boolean) => {
    setRoleError(null);
    setDeleteError(null);
    setResendError(null);
    setPendingUsers((prev) => ({ ...prev, [user.id]: true }));
    const result = await updateUserRole(user.id, role, enable);

    if (!result.success) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : `Impossible de modifier le rôle ${role === 'admin' ? 'administrateur' : 'éditeur'}`;
      setRoleError(message);
    } else {
      await fetchUsers({ status: 'active', page: activePage });
      if (archivedOpen) {
        await fetchUsers({ status: 'inactive', page: inactivePage });
      }
    }

    setPendingUsers((prev) => {
      const updated = { ...prev };
      delete updated[user.id];
      return updated;
    });
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    await handleToggleRole(user, 'admin', !user.is_admin);
  };

  const handleToggleEditor = async (user: AdminUser) => {
    await handleToggleRole(user, 'editor', !user.is_editor);
  };

  const handleToggleActive = (user: AdminUser) => {
    setDeleteError(null);
    setResendError(null);
    setConfirmDialog({
      user,
      targetStatus: !user.is_active,
    });
  };

  const confirmToggleActive = async () => {
    if (!confirmDialog.user || confirmDialog.targetStatus === null) {
      return;
    }

    const user = confirmDialog.user;
    const targetStatus = confirmDialog.targetStatus;

    setPendingUsers((prev) => ({ ...prev, [user.id]: true }));

    const result = await toggleActiveStatus(user.id, targetStatus);

    if (result.success) {
      await fetchUsers({ status: 'active', page: activePage });
      if (archivedOpen) {
        await fetchUsers({ status: 'inactive', page: inactivePage });
      }
    }

    setPendingUsers((prev) => {
      const updated = { ...prev };
      delete updated[user.id];
      return updated;
    });

    setConfirmDialog({ user: null, targetStatus: null });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setDeleteError(null);

    try {
      const rolesToAssign: UserRole[] = [];
      if (inviteForm.isAdmin) {
        rolesToAssign.push('admin');
      }
      if (inviteForm.isEditor) {
        rolesToAssign.push('editor');
      }

      const result = await inviteUser({
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        isAdmin: inviteForm.isAdmin,
        isEditor: inviteForm.isEditor,
        roles: rolesToAssign,
      });

      if (!result.success) {
        throw result.error ?? new Error('Invitation échouée');
      }

      setInviteOpen(false);
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        isAdmin: false,
        isEditor: false,
      });
      await fetchUsers({ status: 'active', page: activePage });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue lors de l’invitation';
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  const inviteButtonDisabled = !inviteForm.email.trim();

  const pendingIds = useMemo(() => new Set(Object.keys(pendingUsers)), [pendingUsers]);

  const handleDeleteRequest = (user: AdminUser) => {
    setDeleteError(null);
    setResendError(null);
    setDeleteDialogUser(user);
  };

  const handleResendInvitation = async (user: AdminUser) => {
    setResendError(null);
    setPendingUsers((prev) => ({ ...prev, [user.id]: true }));

    const result = await resendInvitation(user.id);

    if (!result.success) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : "Impossible de renvoyer l'invitation";
      setResendError(message);
    }

    setPendingUsers((prev) => {
      const updated = { ...prev };
      delete updated[user.id];
      return updated;
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialogUser) {
      return;
    }

    setPendingUsers((prev) => ({ ...prev, [deleteDialogUser.id]: true }));
    const currentTotal = inactivePagination.total;
    const perPage = inactivePagination.perPage;
    const shouldShiftPage =
      inactivePage > 1 && currentTotal - 1 <= perPage * (inactivePage - 1);
    const targetPage = shouldShiftPage ? inactivePage - 1 : inactivePage;

    const result = await deleteUser(deleteDialogUser.id);

    if (!result.success) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : 'Impossible de supprimer cet utilisateur';
      setDeleteError(message);
    } else {
      if (shouldShiftPage) {
        setInactivePage(targetPage);
      }
      await fetchUsers({ status: 'active', page: activePage });
      await fetchUsers({ status: 'inactive', page: targetPage });
    }

    setPendingUsers((prev) => {
      const updated = { ...prev };
      delete updated[deleteDialogUser.id];
      return updated;
    });

    setDeleteDialogUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Utilisateurs</h2>
          <p className="text-gray-600">
            {totalActive} utilisateur·rices actifs
            {archivedOpen ? ` — ${totalInactive} désactivés` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors shadow-md"
        >
          <UserPlus className="w-5 h-5" />
          Inviter un utilisateur
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {roleError && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          {roleError}
        </div>
      )}
      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {deleteError}
        </div>
      )}
      {resendError && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          {resendError}
        </div>
      )}

      <div className="space-y-4">
        {loadingActive ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto" />
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
            Aucun utilisateur actif pour le moment.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activeUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  pending={pendingIds.has(user.id)}
                  onToggleAdmin={handleToggleAdmin}
                  onToggleEditor={handleToggleEditor}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDeleteRequest}
                  onResend={handleResendInvitation}
                  onEdit={(selected) => navigate(`/admin/users/${selected.id}/edit`)}
                />
              ))}
            </div>
            <PaginationControls
              current={activePage}
              total={activePagination.total}
              perPage={activePagination.perPage}
              onChange={setActivePage}
            />
          </>
        )}
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setArchivedOpen((value) => !value)}
          className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          {archivedOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <div className="flex-1">
            <span className="font-semibold text-gray-700">Utilisateurs désactivés</span>
          </div>
          <span className="text-sm text-gray-500">{totalInactive}</span>
        </button>

        {archivedOpen && (
          <div className="px-6 pb-6 space-y-4">
            {loadingInactive ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
              </div>
            ) : inactiveUsers.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                Aucun utilisateur désactivé.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {inactiveUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      pending={pendingIds.has(user.id)}
                      onToggleAdmin={handleToggleAdmin}
                      onToggleEditor={handleToggleEditor}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDeleteRequest}
                      onResend={handleResendInvitation}
                      onEdit={(selected) => navigate(`/admin/users/${selected.id}/edit`)}
                    />
                  ))}
                </div>
                <PaginationControls
                  current={inactivePage}
                  total={inactivePagination.total}
                  perPage={inactivePagination.perPage}
                  onChange={setInactivePage}
                />
              </>
            )}
          </div>
        )}
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Inviter un utilisateur</h3>
                <p className="text-sm text-gray-500">
                  L’utilisateur recevra un email de Supabase pour créer son mot de passe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {inviteError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleInviteSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={inviteForm.isAdmin}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, isAdmin: event.target.checked }))
                    }
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  Donner le rôle administrateur
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={inviteForm.isEditor}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, isEditor: event.target.checked }))
                    }
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  Donner le rôle éditeur
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  disabled={inviteLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || inviteButtonDisabled}
                  className="px-4 py-2 text-sm rounded-lg bg-[#328fce] text-white hover:bg-[#84c19e] transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Invitation...' : 'Envoyer l’invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDialog.user)}
        onClose={() => setConfirmDialog({ user: null, targetStatus: null })}
        onConfirm={confirmToggleActive}
        title={
          confirmDialog.targetStatus
            ? 'Réactiver l’utilisateur ?'
            : 'Désactiver l’utilisateur ?'
        }
        message={
          confirmDialog.user
            ? confirmDialog.targetStatus
              ? `Souhaitez-vous réactiver ${[
                  confirmDialog.user.first_name,
                  confirmDialog.user.last_name,
                ]
                  .filter(Boolean)
                  .join(' ') || confirmDialog.user.email}?`
              : `Souhaitez-vous désactiver ${[
                  confirmDialog.user.first_name,
                  confirmDialog.user.last_name,
                ]
                  .filter(Boolean)
                  .join(' ') || confirmDialog.user.email}?`
            : ''
        }
        confirmText={confirmDialog.targetStatus ? 'Réactiver' : 'Désactiver'}
        isDangerous={!confirmDialog.targetStatus}
        isLoading={
          confirmDialog.user ? Boolean(pendingUsers[confirmDialog.user.id]) : false
        }
      />
      <ConfirmDialog
        isOpen={Boolean(deleteDialogUser)}
        onClose={() => setDeleteDialogUser(null)}
        onConfirm={confirmDeleteUser}
        title="Supprimer l’utilisateur définitivement ?"
        message={
          deleteDialogUser
            ? `Souhaitez-vous supprimer définitivement ${
                [deleteDialogUser.first_name, deleteDialogUser.last_name]
                  .filter(Boolean)
                  .join(' ') || deleteDialogUser.email
              } ? Cette action est irréversible.`
            : ''
        }
        confirmText="Supprimer définitivement"
        isDangerous
        isLoading={
          deleteDialogUser ? Boolean(pendingUsers[deleteDialogUser.id]) : false
        }
      />
    </div>
  );
}


