import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OutputData } from '@editorjs/editorjs';

export interface Highlight {
  id: string;
  title: string;
  content: OutputData;
  link: string | null;
  link_label: string | null;
  gradient_theme: string;
  icon: string;
  order_index: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export function useHighlights(activeOnly: boolean = false) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, [activeOnly]);

  const fetchHighlights = async () => {
    try {
      let query = supabase
        .from('featured_highlights')
        .select('*')
        .order('order_index', { ascending: true });

      if (activeOnly) {
        const now = new Date().toISOString();
        query = query
          .eq('is_active', true)
          .or('start_date.is.null,start_date.lte.' + now)
          .or('end_date.is.null,end_date.gt.' + now)
          .limit(3);
      }

      const { data, error } = await query;

      if (error) throw error;

      const parsedHighlights = (data || []).map((h) => ({
        ...h,
        content: typeof h.content === 'string' ? JSON.parse(h.content) : h.content,
      }));

      setHighlights(parsedHighlights);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const createHighlight = async (highlight: Omit<Highlight, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('featured_highlights')
        .insert({
          ...highlight,
          content: JSON.stringify(highlight.content),
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchHighlights();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating highlight:', error);
      return { success: false, error };
    }
  };

  const updateHighlight = async (id: string, updates: Partial<Highlight>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        ...updates,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (updates.content) {
        updateData.content = JSON.stringify(updates.content);
      }

      const { error } = await supabase
        .from('featured_highlights')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchHighlights();
      return { success: true };
    } catch (error) {
      console.error('Error updating highlight:', error);
      return { success: false, error };
    }
  };

  const deleteHighlight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('featured_highlights')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchHighlights();
      return { success: true };
    } catch (error) {
      console.error('Error deleting highlight:', error);
      return { success: false, error };
    }
  };

  const reorderHighlights = async (reorderedHighlights: Highlight[]) => {
    try {
      for (let i = 0; i < reorderedHighlights.length; i++) {
        const { error } = await supabase
          .from('featured_highlights')
          .update({ order_index: i })
          .eq('id', reorderedHighlights[i].id);

        if (error) throw error;
      }

      await fetchHighlights();
      return { success: true };
    } catch (error) {
      console.error('Error reordering highlights:', error);
      return { success: false, error };
    }
  };

  return {
    highlights,
    loading,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    reorderHighlights,
    refetch: fetchHighlights,
  };
}

