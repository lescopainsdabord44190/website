import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import type { OutputData } from '@editorjs/editorjs';

type CounselorRow = Database['public']['Tables']['counselors']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];

type CounselorWithProjectsRow = CounselorRow & {
  project_counselors?: Array<{
    role: string | null;
    project: ProjectRow | null;
  }>;
};

export interface CounselorProjectSummary {
  role: string | null;
  project: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    short_description: string | null;
    age_group: string | null;
    cover_image_url: string | null;
    content: OutputData | null;
    objectives: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface Counselor {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  focus_areas: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  projects: CounselorProjectSummary[];
}

export type CounselorInput = {
  slug: string;
  first_name: string;
  last_name?: string | null;
  role_title?: string | null;
  tagline?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  focus_areas?: string[];
  is_active?: boolean;
};

interface UseCounselorsOptions {
  includeInactive?: boolean;
}

const normalizeCounselor = (item: CounselorWithProjectsRow): Counselor => {
  const projectLinks = Array.isArray(item.project_counselors) ? item.project_counselors : [];
  const projects: CounselorProjectSummary[] = projectLinks.map((link) => {
    if (!link.project) {
      return {
        role: link.role ?? null,
        project: null,
      };
    }

    const rawContent = link.project.content;
    const parsedContent =
      rawContent && typeof rawContent === 'string'
        ? (JSON.parse(rawContent) as OutputData)
        : (rawContent as OutputData | null);

    return {
      role: link.role ?? null,
      project: {
        id: link.project.id,
        slug: link.project.slug,
        title: link.project.title,
        subtitle: link.project.subtitle,
        short_description: link.project.short_description,
        age_group: link.project.age_group,
        cover_image_url: link.project.cover_image_url,
        content: parsedContent,
        objectives: Array.isArray(link.project.objectives) ? link.project.objectives : [],
        is_active: link.project.is_active,
        created_at: link.project.created_at,
        updated_at: link.project.updated_at,
      },
    };
  });

  return {
    id: item.id,
    slug: item.slug,
    first_name: item.first_name,
    last_name: item.last_name,
    role_title: item.role_title,
    tagline: item.tagline,
    bio: item.bio,
    photo_url: item.photo_url,
    focus_areas: Array.isArray(item.focus_areas) ? item.focus_areas : [],
    order_index: typeof item.order_index === 'number' ? item.order_index : 0,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    projects,
  };
};

export function useCounselors(options: UseCounselorsOptions = {}) {
  const { includeInactive = false } = options;
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);

  const buildBaseQuery = () =>
    supabase
      .from('counselors')
      .select(`
        *,
        project_counselors (
          role,
          project:projects (
            id,
            slug,
            title,
            subtitle,
            short_description,
            age_group,
            cover_image_url,
            content,
            objectives,
            is_active,
            created_at,
            updated_at
          )
        )
      `)
      .order('order_index', { ascending: true })
      .order('first_name', { ascending: true });

  const fetchCounselors = useCallback(async () => {
    setLoading(true);
    try {
      let query = buildBaseQuery();

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as CounselorWithProjectsRow[];

      setCounselors(rows.map(normalizeCounselor));
    } catch (error) {
      console.error('Error fetching counselors:', error);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const fetchCounselorsByStatus = useCallback(async (isActive: boolean) => {
    try {
      const { data, error } = await buildBaseQuery().eq('is_active', isActive);

      if (error) throw error;

      const rows = (data || []) as CounselorWithProjectsRow[];
      return {
        success: true as const,
        data: rows.map(normalizeCounselor),
      };
    } catch (error) {
      console.error('Error fetching counselors by status:', error);
      return { success: false as const, error };
    }
  }, []);

  useEffect(() => {
    fetchCounselors();
  }, [fetchCounselors]);

  const createCounselor = async (payload: CounselorInput) => {
    try {
      const dataToInsert = {
        ...payload,
        focus_areas: payload.focus_areas ?? [],
        is_active: payload.is_active ?? true,
        order_index: counselors.length,
      };

      const { data, error } = await supabase
        .from('counselors')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      await fetchCounselors();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating counselor:', error);
      return { success: false, error };
    }
  };

  const reorderCounselors = async (orderedCounselors: Counselor[]) => {
    try {
      for (let index = 0; index < orderedCounselors.length; index++) {
        const counselor = orderedCounselors[index];
        const { error } = await supabase
          .from('counselors')
          .update({
            order_index: index,
            updated_at: new Date().toISOString(),
          })
          .eq('id', counselor.id);

        if (error) throw error;
      }

      await fetchCounselors();
      return { success: true };
    } catch (error) {
      console.error('Error reordering counselors:', error);
      return { success: false, error };
    }
  };

  const updateCounselor = async (id: string, updates: Partial<CounselorInput>) => {
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
        .from('counselors')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      await fetchCounselors();
      return { success: true };
    } catch (error) {
      console.error('Error updating counselor:', error);
      return { success: false, error };
    }
  };

  const deleteCounselor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('counselors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCounselors();
      return { success: true };
    } catch (error) {
      console.error('Error deleting counselor:', error);
      return { success: false, error };
    }
  };

  return {
    counselors,
    loading,
    createCounselor,
    updateCounselor,
    deleteCounselor,
    reorderCounselors,
    refetch: fetchCounselors,
    fetchCounselorsByStatus,
  };
}


