import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type CommissionRow = Database['public']['Tables']['commissions']['Row'];
type VolunteerRow = Database['public']['Tables']['volunteers']['Row'];

type CommissionWithRelationsRow = CommissionRow & {
  commission_volunteers?: Array<{
    role: string | null;
    notes: string | null;
    volunteer: VolunteerRow | null;
  }>;
};

export interface CommissionVolunteerSummary {
  role: string | null;
  notes: string | null;
  volunteer: {
    id: string;
    slug: string;
    first_name: string;
    last_name: string | null;
    role_title: string | null;
    is_active: boolean;
  } | null;
}

export interface Commission {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  volunteers: CommissionVolunteerSummary[];
}

export type CommissionInput = {
  slug: string;
  title: string;
  description?: string | null;
  is_active?: boolean;
};

export type CommissionVolunteerLink = {
  volunteer_id: string;
  role?: string | null;
  notes?: string | null;
};

interface UseCommissionsOptions {
  includeInactive?: boolean;
}

const normalizeCommission = (item: CommissionWithRelationsRow): Commission => {
  const volunteerLinks = Array.isArray(item.commission_volunteers) ? item.commission_volunteers : [];

  const volunteers: CommissionVolunteerSummary[] = volunteerLinks.map((link) => ({
    role: link.role ?? null,
    notes: link.notes ?? null,
    volunteer: link.volunteer
      ? {
          id: link.volunteer.id,
          slug: link.volunteer.slug,
          first_name: link.volunteer.first_name,
          last_name: link.volunteer.last_name,
          role_title: link.volunteer.role_title,
          is_active: link.volunteer.is_active,
        }
      : null,
  }));

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    order_index: typeof item.order_index === 'number' ? item.order_index : 0,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    volunteers,
  };
};

export function useCommissions(options: UseCommissionsOptions = {}) {
  const { includeInactive = false } = options;
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const buildBaseQuery = () =>
    supabase
      .from('commissions')
      .select(
        `
        *,
        commission_volunteers (
          role,
          notes,
          volunteer:volunteers (
            id,
            slug,
            first_name,
            last_name,
            role_title,
            is_active
          )
        )
      `
      )
      .order('order_index', { ascending: true })
      .order('title', { ascending: true });

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = buildBaseQuery();

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as CommissionWithRelationsRow[];
      setCommissions(rows.map(normalizeCommission));
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const fetchCommissionsByStatus = useCallback(async (isActive: boolean) => {
    try {
      const { data, error } = await buildBaseQuery().eq('is_active', isActive);

      if (error) throw error;

      const rows = (data || []) as CommissionWithRelationsRow[];
      return {
        success: true as const,
        data: rows.map(normalizeCommission),
      };
    } catch (error) {
      console.error('Error fetching commissions by status:', error);
      return { success: false as const, error };
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const syncCommissionVolunteers = async (commissionId: string, links: CommissionVolunteerLink[]) => {
    const sanitizedLinks = links
      .filter((link) => link.volunteer_id)
      .map((link) => ({
        commission_id: commissionId,
        volunteer_id: link.volunteer_id,
        role: link.role ?? null,
        notes: link.notes ?? null,
      }));

    const { error: deleteError } = await supabase
      .from('commission_volunteers')
      .delete()
      .eq('commission_id', commissionId);

    if (deleteError) throw deleteError;

    if (sanitizedLinks.length === 0) {
      return;
    }

    const { error: insertError } = await supabase.from('commission_volunteers').insert(sanitizedLinks);
    if (insertError) throw insertError;
  };

  const createCommission = async (payload: CommissionInput, volunteerLinks: CommissionVolunteerLink[] = []) => {
    try {
      const dataToInsert = {
        ...payload,
        is_active: payload.is_active ?? true,
        order_index: commissions.length,
      };

      const { data, error } = await supabase
        .from('commissions')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      if (data && volunteerLinks.length > 0) {
        await syncCommissionVolunteers(data.id, volunteerLinks);
      }

      await fetchCommissions();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating commission:', error);
      return { success: false, error };
    }
  };

  const reorderCommissions = async (orderedCommissions: Commission[]) => {
    try {
      for (let index = 0; index < orderedCommissions.length; index++) {
        const commission = orderedCommissions[index];
        const { error } = await supabase
          .from('commissions')
          .update({
            order_index: index,
            updated_at: new Date().toISOString(),
          })
          .eq('id', commission.id);

        if (error) throw error;
      }

      await fetchCommissions();
      return { success: true };
    } catch (error) {
      console.error('Error reordering commissions:', error);
      return { success: false, error };
    }
  };

  const updateCommission = async (
    id: string,
    updates: Partial<CommissionInput>,
    volunteerLinks?: CommissionVolunteerLink[]
  ) => {
    try {
      const dataToUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          dataToUpdate[key] = value;
        }
      });

      const { error } = await supabase
        .from('commissions')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      if (volunteerLinks) {
        await syncCommissionVolunteers(id, volunteerLinks);
      }

      await fetchCommissions();
      return { success: true };
    } catch (error) {
      console.error('Error updating commission:', error);
      return { success: false, error };
    }
  };

  const deleteCommission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCommissions();
      return { success: true };
    } catch (error) {
      console.error('Error deleting commission:', error);
      return { success: false, error };
    }
  };

  return {
    commissions,
    loading,
    createCommission,
    updateCommission,
    deleteCommission,
    reorderCommissions,
    refetch: fetchCommissions,
    fetchCommissionsByStatus,
  };
}


