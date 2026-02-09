import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/slugify';

export interface NewsTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

const normalizeTag = (tag: any): NewsTag => ({
  id: tag.id,
  name: tag.name,
  slug: tag.slug,
  created_at: tag.created_at,
  updated_at: tag.updated_at,
});

export function useNewsTags() {
  const [tags, setTags] = useState<NewsTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('news_tags')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      const normalized = (data || []).map(normalizeTag);
      setTags(normalized);
      return { success: true as const, data: normalized };
    } catch (err) {
      console.error('Error fetching tags:', err);
      setTags([]);
      setError('Impossible de charger les tags');
      return { success: false as const, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false as const, error: new Error('Nom de tag vide') };
      }

      try {
        const { data, error: insertError } = await supabase
          .from('news_tags')
          .insert({
            name: trimmed,
            slug: slugify(trimmed),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await fetchTags();
        return { success: true as const, data: normalizeTag(data) };
      } catch (err) {
        console.error('Error creating tag:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchTags]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Pick<NewsTag, 'name' | 'slug'>>) => {
      try {
        const payload = { ...updates } as Record<string, string>;

        if (updates.name && !updates.slug) {
          payload.slug = slugify(updates.name);
        }

        const { error: updateError } = await supabase
          .from('news_tags')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        await fetchTags();
        return { success: true as const };
      } catch (err) {
        console.error('Error updating tag:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchTags]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('news_tags').delete().eq('id', id);
        if (deleteError) throw deleteError;
        await fetchTags();
        return { success: true as const };
      } catch (err) {
        console.error('Error deleting tag:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchTags]
  );

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
