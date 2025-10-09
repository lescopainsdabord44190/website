import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Page {
  id: string;
  title: string;
  slug: string;
  meta_description: string;
  content: any;
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
  show_in_menu: boolean;
  created_at: string;
  updated_at: string;
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  return { pages, loading, refetch: fetchPages };
}

export function usePageBySlug(fullSlug: string) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fullSlug) return;

    const fetchPage = async () => {
      try {
        const slugParts = fullSlug.split('/').filter(Boolean);
        const targetSlug = slugParts[slugParts.length - 1];

        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', targetSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setPage(data);
      } catch (error) {
        console.error('Error fetching page:', error);
        setPage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [fullSlug]);

  return { page, loading };
}
