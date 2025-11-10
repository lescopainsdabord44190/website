import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../contexts/AuthContext';

export type UserStatus = 'active' | 'inactive';

export interface AdminUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  is_editor: boolean;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  page: number;
  perPage: number;
  total: number;
}

interface FetchUsersOptions {
  status: UserStatus;
  page?: number;
  perPage?: number;
  search?: string;
}

interface InviteUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEditor?: boolean;
  roles?: UserRole[];
}

interface DeleteUserResult {
  success: boolean;
  error?: unknown;
}

const DEFAULT_PAGE_SIZE = 12;

const isUserRole = (role: string | null | undefined): role is UserRole =>
  role === 'admin' || role === 'editor';

export function useAdminUsers() {
  const [activeUsers, setActiveUsers] = useState<AdminUser[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<AdminUser[]>([]);
  const [activePagination, setActivePagination] = useState<PaginatedUsers>({
    page: 1,
    perPage: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [inactivePagination, setInactivePagination] = useState<PaginatedUsers>({
    page: 1,
    perPage: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async ({ status, page = 1, perPage = DEFAULT_PAGE_SIZE, search }: FetchUsersOptions) => {
      const setLoading = status === 'active' ? setLoadingActive : setLoadingInactive;
      const setUsers = status === 'active' ? setActiveUsers : setInactiveUsers;
      const setPagination = status === 'active' ? setActivePagination : setInactivePagination;

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('profiles')
          .select(
            'id, email, first_name, last_name, avatar_url, is_active, created_at, updated_at',
            { count: 'exact' }
          )
          .order('created_at', { ascending: true });

        query = status === 'active' ? query.eq('is_active', true) : query.eq('is_active', false);

        if (search && search.trim().length > 0) {
          const term = `%${search.trim()}%`;
          query = query.or(
            `email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`
          );
        }

        const rangeStart = (page - 1) * perPage;
        const rangeEnd = rangeStart + perPage - 1;

        const { data, error: fetchError, count } = await query.range(rangeStart, rangeEnd);

        if (fetchError) {
          throw fetchError;
        }

        const profiles = data ?? [];
        const ids = profiles.map((profile) => profile.id);

        const rolesMap = new Map<string, UserRole[]>();

        if (ids.length > 0) {
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', ids);

          if (rolesError) {
            throw rolesError;
          }

          rolesData?.forEach((roleRow) => {
            if (!isUserRole(roleRow.role)) {
              return;
            }
            const existing = rolesMap.get(roleRow.user_id) ?? [];
            rolesMap.set(roleRow.user_id, Array.from(new Set([...existing, roleRow.role])));
          });
        }

        const normalized: AdminUser[] = profiles.map((profile) => {
          const userRoles = rolesMap.get(profile.id) ?? [];
          return {
            id: profile.id,
            email: profile.email ?? null,
            first_name: profile.first_name ?? null,
            last_name: profile.last_name ?? null,
            avatar_url: profile.avatar_url ?? null,
            is_active: profile.is_active ?? false,
            roles: userRoles,
            is_admin: userRoles.includes('admin'),
            is_editor: userRoles.includes('editor'),
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          };
        });

        setUsers(normalized);
        setPagination({
          page,
          perPage,
          total: count ?? normalized.length,
        });

        return {
          success: true as const,
          data: normalized,
          pagination: {
            page,
            perPage,
            total: count ?? normalized.length,
          },
        };
      } catch (err) {
        console.error('Error fetching admin users:', err);
        setUsers([]);
        setPagination({ page, perPage, total: 0 });
        setError('Erreur lors du chargement des utilisateurs');

        return {
          success: false as const,
          error: err,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const inviteUser = useCallback(async (payload: InviteUserPayload) => {
    try {
      const normalizedRoles = new Set<UserRole>();

      payload.roles?.forEach((role) => {
        if (role) {
          normalizedRoles.add(role);
        }
      });

      if (payload.isAdmin) {
        normalizedRoles.add('admin');
      }

      if (payload.isEditor) {
        normalizedRoles.add('editor');
      }

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        data?: Record<string, unknown>;
        error?: string;
      }>('admin-users', {
        body: {
          action: 'invite',
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          isAdmin: payload.isAdmin ?? false,
          isEditor: payload.isEditor ?? false,
          roles: Array.from(normalizedRoles),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invitation échouée');
      }

      return { success: true as const, data: data.data };
    } catch (err) {
      console.error('Error inviting user:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const toggleActiveStatus = useCallback(async (userId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('admin-users', {
        body: {
          action: 'toggle_active',
          userId,
          isActive,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Mise à jour du statut impossible');
      }

      return { success: true as const };
    } catch (err) {
      console.error('Error toggling user status:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const updatePassword = useCallback(async (userId: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('admin-users', {
        body: {
          action: 'update_password',
          userId,
          password,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Mise à jour du mot de passe impossible');
      }

      return { success: true as const };
    } catch (err) {
      console.error('Error updating password:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const resendInvitation = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('admin-users', {
        body: {
          action: 'resend_invitation',
          userId,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Renvoi de l'invitation impossible");
      }

      return { success: true as const };
    } catch (err) {
      console.error('Error resending invitation:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<DeleteUserResult> => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('admin-users', {
        body: {
          action: 'delete_user',
          userId,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Suppression impossible');
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting user:', err);
      return { success: false, error: err };
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: UserRole, enable: boolean) => {
    try {
      if (enable) {
        const { error } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });

        if (error) {
          throw error;
        }

        return { success: true as const };
      }

      if (role === 'admin') {
        const { count, error: countError } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (countError) {
          throw countError;
        }

        if ((count ?? 0) <= 1) {
          return {
            success: false as const,
            error: new Error('Impossible de retirer le dernier administrateur'),
          };
        }
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        throw error;
      }

      return { success: true as const };
    } catch (err) {
      console.error('Error updating user role:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const updateProfile = useCallback(
    async (userId: string, updates: Partial<Pick<AdminUser, 'first_name' | 'last_name' | 'avatar_url'>>) => {
      try {
        const payload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (updates.first_name !== undefined) {
          payload.first_name = updates.first_name;
        }

        if (updates.last_name !== undefined) {
          payload.last_name = updates.last_name;
        }

        if (updates.avatar_url !== undefined) {
          payload.avatar_url = updates.avatar_url;
        }

        const { error } = await supabase.from('profiles').update(payload).eq('id', userId);

        if (error) {
          throw error;
        }

        return { success: true as const };
      } catch (err) {
        console.error('Error updating profile:', err);
        return { success: false as const, error: err };
      }
    },
    []
  );

  const getUserById = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, is_active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return { success: false as const, error: new Error('Utilisateur introuvable') };
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        throw rolesError;
      }

      const normalizedRoles =
        rolesData?.map((row) => row.role).filter(isUserRole) ?? [];

      const user: AdminUser = {
        id: profile.id,
        email: profile.email ?? null,
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        is_active: profile.is_active ?? false,
        roles: normalizedRoles,
        is_admin: normalizedRoles.includes('admin'),
        is_editor: normalizedRoles.includes('editor'),
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };

      return { success: true as const, data: user };
    } catch (err) {
      console.error('Error fetching user by id:', err);
      return { success: false as const, error: err };
    }
  }, []);

  return {
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
    updatePassword,
    resendInvitation,
    updateProfile,
    getUserById,
    deleteUser,
  };
}


