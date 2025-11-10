import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PAGES_REFETCH_EVENT = 'pages:refetch';

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

export function triggerPagesRefetch() {
  window.dispatchEvent(new Event(PAGES_REFETCH_EVENT));
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    const handler = () => {
      fetchPages();
    };

    window.addEventListener(PAGES_REFETCH_EVENT, handler);
    return () => window.removeEventListener(PAGES_REFETCH_EVENT, handler);
  }, [fetchPages]);

  return { pages, loading, refetch: fetchPages };
}

export function usePageBySlug(fullSlug: string) {
  const { isAdmin, isEditor, user } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async () => {
    if (!fullSlug) return;

    try {
      const slugParts = fullSlug.split('/').filter(Boolean);
      const targetSlug = slugParts[slugParts.length - 1];

      let query = supabase.from('pages').select('*');

      if (!isAdmin && !isEditor) {
        query = query.eq('is_active', true);
      }

      const { data: allPages, error: pagesError } = await query;

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
  }, [fullSlug, isAdmin, isEditor]);

  useEffect(() => {
    setLoading(true);
    fetchPage();
  }, [fetchPage, user]);

  useEffect(() => {
    const handler = () => {
      fetchPage();
    };

    window.addEventListener(PAGES_REFETCH_EVENT, handler);
    return () => window.removeEventListener(PAGES_REFETCH_EVENT, handler);
  }, [fetchPage]);

  return { page, loading, refetch: fetchPage };
}
