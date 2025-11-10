import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type VolunteerRow = Database['public']['Tables']['volunteers']['Row'];
type CommissionRow = Database['public']['Tables']['commissions']['Row'];

type VolunteerWithRelationsRow = VolunteerRow & {
  commission_volunteers?: Array<{
    role: string | null;
    notes: string | null;
    commission: CommissionRow | null;
  }>;
};

export interface VolunteerCommissionSummary {
  role: string | null;
  notes: string | null;
  commission: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface Volunteer {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
  is_executive_member: boolean;
  is_board_member: boolean;
  mandate_start_date: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  commissions: VolunteerCommissionSummary[];
}

export type VolunteerInput = {
  slug: string;
  first_name: string;
  last_name?: string | null;
  role_title?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  is_executive_member?: boolean;
  is_board_member?: boolean;
  mandate_start_date?: string | null;
  is_active?: boolean;
};

export type VolunteerCommissionLink = {
  commission_id: string;
  role?: string | null;
  notes?: string | null;
};

interface UseVolunteersOptions {
  includeInactive?: boolean;
}

const normalizeVolunteer = (item: VolunteerWithRelationsRow): Volunteer => {
  const commissionLinks = Array.isArray(item.commission_volunteers) ? item.commission_volunteers : [];

  const commissions: VolunteerCommissionSummary[] = commissionLinks.map((link) => ({
    role: link.role ?? null,
    notes: link.notes ?? null,
    commission: link.commission
      ? {
          id: link.commission.id,
          slug: link.commission.slug,
          title: link.commission.title,
          description: link.commission.description,
          order_index: link.commission.order_index ?? 0,
          is_active: link.commission.is_active,
          created_at: link.commission.created_at,
          updated_at: link.commission.updated_at,
        }
      : null,
  }));

  return {
    id: item.id,
    slug: item.slug,
    first_name: item.first_name,
    last_name: item.last_name,
    role_title: item.role_title,
    bio: item.bio,
    photo_url: item.photo_url,
    is_executive_member: Boolean(item.is_executive_member),
    is_board_member: Boolean(item.is_board_member),
    mandate_start_date: item.mandate_start_date,
    order_index: typeof item.order_index === 'number' ? item.order_index : 0,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    commissions,
  };
};

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const { includeInactive = false } = options;
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  const buildBaseQuery = () =>
    supabase
      .from('volunteers')
      .select(
        `
        *,
        commission_volunteers (
          role,
          notes,
          commission:commissions (
            id,
            slug,
            title,
            description,
            order_index,
            is_active,
            created_at,
            updated_at
          )
        )
      `
      )
      .order('order_index', { ascending: true })
      .order('first_name', { ascending: true });

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      let query = buildBaseQuery();

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as VolunteerWithRelationsRow[];
      setVolunteers(rows.map(normalizeVolunteer));
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const fetchVolunteersByStatus = useCallback(async (isActive: boolean) => {
    try {
      const { data, error } = await buildBaseQuery().eq('is_active', isActive);

      if (error) throw error;

      const rows = (data || []) as VolunteerWithRelationsRow[];
      return {
        success: true as const,
        data: rows.map(normalizeVolunteer),
      };
    } catch (error) {
      console.error('Error fetching volunteers by status:', error);
      return { success: false as const, error };
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const syncVolunteerCommissions = async (volunteerId: string, links: VolunteerCommissionLink[]) => {
    const sanitizedLinks = links
      .filter((link) => link.commission_id)
      .map((link) => ({
        volunteer_id: volunteerId,
        commission_id: link.commission_id,
        role: link.role ?? null,
        notes: link.notes ?? null,
      }));

    const { error: deleteError } = await supabase
      .from('commission_volunteers')
      .delete()
      .eq('volunteer_id', volunteerId);

    if (deleteError) throw deleteError;

    if (sanitizedLinks.length === 0) {
      return;
    }

    const { error: insertError } = await supabase.from('commission_volunteers').insert(sanitizedLinks);
    if (insertError) throw insertError;
  };

  const createVolunteer = async (payload: VolunteerInput, commissionLinks: VolunteerCommissionLink[] = []) => {
    try {
      const dataToInsert = {
        ...payload,
        is_active: payload.is_active ?? true,
        order_index: volunteers.length,
      };

      const { data, error } = await supabase
        .from('volunteers')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      if (data && commissionLinks.length > 0) {
        await syncVolunteerCommissions(data.id, commissionLinks);
      }

      await fetchVolunteers();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating volunteer:', error);
      return { success: false, error };
    }
  };

  const reorderVolunteers = async (orderedVolunteers: Volunteer[]) => {
    try {
      for (let index = 0; index < orderedVolunteers.length; index++) {
        const volunteer = orderedVolunteers[index];
        const { error } = await supabase
          .from('volunteers')
          .update({
            order_index: index,
            updated_at: new Date().toISOString(),
          })
          .eq('id', volunteer.id);

        if (error) throw error;
      }

      await fetchVolunteers();
      return { success: true };
    } catch (error) {
      console.error('Error reordering volunteers:', error);
      return { success: false, error };
    }
  };

  const updateVolunteer = async (
    id: string,
    updates: Partial<VolunteerInput>,
    commissionLinks?: VolunteerCommissionLink[]
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
        .from('volunteers')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      if (commissionLinks) {
        await syncVolunteerCommissions(id, commissionLinks);
      }

      await fetchVolunteers();
      return { success: true };
    } catch (error) {
      console.error('Error updating volunteer:', error);
      return { success: false, error };
    }
  };

  const deleteVolunteer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchVolunteers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting volunteer:', error);
      return { success: false, error };
    }
  };

  return {
    volunteers,
    loading,
    createVolunteer,
    updateVolunteer,
    deleteVolunteer,
    reorderVolunteers,
    refetch: fetchVolunteers,
    fetchVolunteersByStatus,
  };
}


