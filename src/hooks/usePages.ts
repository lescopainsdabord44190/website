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
  show_in_footer?: boolean;
  show_toc?: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export function buildFullPath(pageId: string, allPages: Page[]): string {
  const path: string[] = [];
  let currentPage = allPages.find((p) => p.id === pageId);
  
  while (currentPage) {
    path.unshift(currentPage.slug);
    if (currentPage.parent_id) {
      currentPage = allPages.find((p) => p.id === currentPage!.parent_id);
    } else {
      currentPage = undefined;
    }
  }
  
  return '/' + path.join('/');
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

        const { data: allPages, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .eq('is_active', true);

        if (pagesError) throw pagesError;

        const candidatePage = allPages?.find((p) => p.slug === targetSlug);
        
        if (!candidatePage) {
          setPage(null);
          return;
        }

        const expectedPath = buildFullPath(candidatePage.id, allPages || []);
        const actualPath = '/' + slugParts.join('/');
        
        if (expectedPath === actualPath) {
          setPage(candidatePage);
        } else {
          setPage(null);
        }
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
