import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface NewsCategory {
  id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const normalizeCategory = (category: any): NewsCategory => ({
  id: category.id,
  name: category.name,
  color: category.color,
  order_index: category.order_index ?? 0,
  created_at: category.created_at,
  updated_at: category.updated_at,
});

export function useNewsCategories() {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('news_categories')
        .select('*')
        .order('order_index', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories((data || []).map(normalizeCategory));
      return { success: true as const, data: (data || []).map(normalizeCategory) };
    } catch (err) {
      console.error('Error fetching news categories:', err);
      setCategories([]);
      setError('Impossible de charger les catégories');
      return { success: false as const, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(
    async (payload: { name: string; color: string; order_index?: number }) => {
      try {
        const { data, error: insertError } = await supabase
          .from('news_categories')
          .insert({
            name: payload.name.trim(),
            color: payload.color,
            order_index: payload.order_index ?? 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await fetchCategories();
        return { success: true as const, data: normalizeCategory(data) };
      } catch (err) {
        console.error('Error creating category:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchCategories]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Pick<NewsCategory, 'name' | 'color' | 'order_index'>>) => {
      try {
        const { error: updateError } = await supabase
          .from('news_categories')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        await fetchCategories();
        return { success: true as const };
      } catch (err) {
        console.error('Error updating category:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('news_categories').delete().eq('id', id);
        if (deleteError) throw deleteError;
        await fetchCategories();
        return { success: true as const };
      } catch (err) {
        console.error('Error deleting category:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchCategories]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
