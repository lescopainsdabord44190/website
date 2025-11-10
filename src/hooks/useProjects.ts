import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import type { OutputData } from '@editorjs/editorjs';

export interface CounselorSummary {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  tagline: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface ProjectCounselor {
  role: string | null;
  counselor: CounselorSummary | null;
}

export interface Project {
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
  counselors: ProjectCounselor[];
}

export type ProjectInput = {
  slug: string;
  title: string;
  subtitle?: string | null;
  short_description?: string | null;
  age_group?: string | null;
  cover_image_url?: string | null;
  content?: OutputData | null;
  objectives?: string[];
  is_active?: boolean;
};

export type ProjectCounselorLink = {
  counselor_id: string;
  role?: string | null;
};

interface UseProjectsOptions {
  includeInactive?: boolean;
}

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type CounselorRow = Database['public']['Tables']['counselors']['Row'];

type ProjectWithRelationsRow = ProjectRow & {
  project_counselors?: Array<{
    role: string | null;
    counselor: CounselorRow | null;
  }>;
};

function transformProjectRow(item: ProjectWithRelationsRow): Project {
  const rawContent = item.content;
  const parsedContent =
    rawContent && typeof rawContent === 'string'
      ? (JSON.parse(rawContent) as OutputData)
      : (rawContent as OutputData | null);

  const projectLinks = Array.isArray(item.project_counselors) ? item.project_counselors : [];

  const counselors: ProjectCounselor[] = projectLinks.map((link) => ({
    role: link.role ?? null,
    counselor: link.counselor
      ? {
          id: link.counselor.id,
          slug: link.counselor.slug,
          first_name: link.counselor.first_name,
          last_name: link.counselor.last_name,
          role_title: link.counselor.role_title,
          tagline: link.counselor.tagline,
          photo_url: link.counselor.photo_url,
          is_active: link.counselor.is_active,
        }
      : null,
  }));

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    short_description: item.short_description,
    age_group: item.age_group,
    cover_image_url: item.cover_image_url,
    content: parsedContent,
    objectives: Array.isArray(item.objectives) ? item.objectives : [],
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    counselors,
  };
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { includeInactive = false } = options;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const buildBaseQuery = () =>
    supabase
      .from('projects')
      .select(`
        *,
        project_counselors (
          role,
          counselor:counselors (
            id,
            slug,
            first_name,
            last_name,
            role_title,
            tagline,
            photo_url,
            is_active
          )
        )
      `)
      .order('title', { ascending: true });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let query = buildBaseQuery();

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as ProjectWithRelationsRow[];
      const normalized = rows.map((item) => transformProjectRow(item));

      setProjects(normalized);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const fetchProjectsByStatus = useCallback(async (isActive: boolean) => {
    try {
      const { data, error } = await buildBaseQuery().eq('is_active', isActive);

      if (error) throw error;

      const rows = (data || []) as ProjectWithRelationsRow[];
      const normalized = rows.map((item) => transformProjectRow(item));

      return { success: true as const, data: normalized };
    } catch (error) {
      console.error('Error fetching projects by status:', error);
      return { success: false as const, error };
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const syncProjectCounselors = async (projectId: string, links: ProjectCounselorLink[]) => {
    const sanitizedLinks = links
      .filter((link) => link.counselor_id)
      .map((link) => ({
        project_id: projectId,
        counselor_id: link.counselor_id,
        role: link.role ?? null,
      }));

    const { error: deleteError } = await supabase
      .from('project_counselors')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;

    if (sanitizedLinks.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from('project_counselors')
      .insert(sanitizedLinks);

    if (insertError) throw insertError;
  };

  const createProject = async (payload: ProjectInput, counselorLinks: ProjectCounselorLink[] = []) => {
    try {
      const dataToInsert = {
        ...payload,
        objectives: payload.objectives ?? [],
        is_active: payload.is_active ?? true,
        content: payload.content ?? { time: Date.now(), blocks: [], version: '2.31.0' },
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      if (data && counselorLinks.length > 0) {
        await syncProjectCounselors(data.id, counselorLinks);
      }

      await fetchProjects();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating project:', error);
      return { success: false, error };
    }
  };

  const updateProject = async (
    id: string,
    updates: Partial<ProjectInput>,
    counselorLinks?: ProjectCounselorLink[]
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
        .from('projects')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      if (counselorLinks) {
        await syncProjectCounselors(id, counselorLinks);
      }

      await fetchProjects();
      return { success: true };
    } catch (error) {
      console.error('Error updating project:', error);
      return { success: false, error };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProjects();
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error };
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
    fetchProjectsByStatus,
  };
}

export function useProjectBySlug(slug?: string, options: { includeInactive?: boolean } = {}) {
  const { includeInactive = false } = options;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProject = async () => {
      if (!slug) {
        if (isMounted) {
          setProject(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('projects')
          .select(
            `
            *,
            project_counselors (
              role,
              counselor:counselors (
                id,
                slug,
                first_name,
                last_name,
                role_title,
                tagline,
                photo_url,
                is_active
              )
            )
          `
          )
          .eq('slug', slug);

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error: queryError } = await query.maybeSingle();

        if (queryError) throw queryError;

        if (!isMounted) return;

        if (data) {
          setProject(transformProjectRow(data as ProjectWithRelationsRow));
        } else {
          setProject(null);
        }
      } catch (err) {
        console.error('Error fetching project by slug:', err);
        if (isMounted) {
          setError(err as Error);
          setProject(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProject();

    return () => {
      isMounted = false;
    };
  }, [slug, includeInactive]);

  return { project, loading, error };
}



