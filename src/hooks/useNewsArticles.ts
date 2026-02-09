import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OutputData } from '@editorjs/editorjs';
import { slugify } from '../lib/slugify';
import type { NewsCategory } from './useNewsCategories';
import type { NewsTag } from './useNewsTags';

export type NewsStatus = 'draft' | 'published';

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: OutputData;
  status: NewsStatus;
  category_id: string | null;
  category: NewsCategory | null;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url?: string | null;
  } | null;
  image_url: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  tags: NewsTag[];
}

export interface PaginatedArticles {
  page: number;
  perPage: number;
  total: number;
}

export interface FetchNewsArticlesOptions {
  page?: number;
  perPage?: number;
  search?: string;
  categoryId?: string | null;
  status?: 'all' | NewsStatus;
  onlyPublished?: boolean;
  onlyPublishedVisible?: boolean;
}

export interface UpsertNewsArticleInput {
  id?: string;
  title: string;
  slug?: string;
  summary?: string;
  content?: OutputData;
  status?: NewsStatus;
  category_id?: string | null;
  image_url?: string | null;
  author_id?: string | null;
  published_at?: string | null;
  tag_ids?: string[];
}

const DEFAULT_PAGE_SIZE = 10;

const normalizeArticle = (raw: any): NewsArticle => {
  const tags = (raw.news_article_tags || [])
    .map((entry: any) => entry.news_tags)
    .filter(Boolean)
    .map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    }));

  const category = raw.category || raw.news_categories || null;
  const author = raw.author || raw.profiles || null;

  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    summary: raw.summary ?? '',
    content: typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content,
    status: raw.status,
    category_id: raw.category_id ?? null,
    category: category
      ? {
          id: category.id,
          name: category.name,
          color: category.color,
          order_index: category.order_index ?? 0,
          created_at: category.created_at,
          updated_at: category.updated_at,
        }
      : null,
    author: author
      ? {
          id: author.id,
          first_name: author.first_name ?? null,
          last_name: author.last_name ?? null,
          avatar_url: author.avatar_url ?? null,
        }
      : null,
    image_url: raw.image_url ?? null,
    author_id: raw.author_id ?? null,
    published_at: raw.published_at ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    created_by: raw.created_by ?? null,
    updated_by: raw.updated_by ?? null,
    tags,
  };
};

async function syncArticleTags(articleId: string, tagIds: string[]) {
  const uniqueIds = Array.from(new Set(tagIds));

  const { data: existing } = await supabase
    .from('news_article_tags')
    .select('tag_id')
    .eq('article_id', articleId);

  const existingIds = new Set((existing || []).map((row) => row.tag_id));
  const toInsert = uniqueIds.filter((id) => !existingIds.has(id));
  const toDelete = Array.from(existingIds).filter((id) => !uniqueIds.includes(id));

  if (toDelete.length > 0) {
    await supabase
      .from('news_article_tags')
      .delete()
      .eq('article_id', articleId)
      .in('tag_id', toDelete);
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((tagId) => ({ article_id: articleId, tag_id: tagId }));
    await supabase.from('news_article_tags').insert(rows);
  }
}

export function useNewsArticles(initialOptions: FetchNewsArticlesOptions = {}) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedArticles>({
    page: initialOptions.page ?? 1,
    perPage: initialOptions.perPage ?? DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [filters, setFilters] = useState<FetchNewsArticlesOptions>({
    page: initialOptions.page ?? 1,
    perPage: initialOptions.perPage ?? DEFAULT_PAGE_SIZE,
    search: initialOptions.search ?? '',
    categoryId: initialOptions.categoryId ?? null,
    status: initialOptions.status ?? 'all',
    onlyPublished: initialOptions.onlyPublished ?? false,
    onlyPublishedVisible: initialOptions.onlyPublishedVisible ?? false,
  });

  const fetchArticles = useCallback(
    async (override?: FetchNewsArticlesOptions) => {
      const merged = { ...filters, ...override };
      const page = merged.page ?? 1;
      const perPage = merged.perPage ?? DEFAULT_PAGE_SIZE;

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('news_articles')
          .select(
            `
              *,
              category:news_categories(*),
            author:profiles(id, first_name, last_name, avatar_url),
              news_article_tags(
                tag_id,
                news_tags(*)
              )
            `,
            { count: 'exact' }
          );

        const searchTerm = merged.search?.trim();
        if (searchTerm) {
          const ilikeTerm = `%${searchTerm}%`;
          query = query.ilike('title', ilikeTerm);
        }

        if (merged.categoryId) {
          query = query.eq('category_id', merged.categoryId);
        }

        if (merged.status && merged.status !== 'all') {
          query = query.eq('status', merged.status);
        }

        if (merged.onlyPublished) {
          query = query.eq('status', 'published');
        }

        if (merged.onlyPublishedVisible) {
          const now = new Date().toISOString();
          query = query.lte('published_at', now);
        }

        const rangeStart = (page - 1) * perPage;
        const rangeEnd = rangeStart + perPage - 1;

        query = query.order('published_at', { ascending: false, nullsLast: true });

        const { data, error: fetchError, count } = await query.range(rangeStart, rangeEnd);
        if (fetchError) throw fetchError;

        const normalized = (data || []).map(normalizeArticle);
        setArticles(normalized);
        setPagination({
          page,
          perPage,
          total: count ?? normalized.length,
        });

        return { success: true as const, data: normalized, pagination: { page, perPage, total: count ?? normalized.length } };
      } catch (err) {
        console.error('Error fetching news articles:', err);
        setArticles([]);
        setPagination({ page, perPage, total: 0 });
        setError('Impossible de charger les articles');
        return { success: false as const, error: err };
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const createArticle = useCallback(
    async (input: UpsertNewsArticleInput) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
          title: input.title.trim(),
          slug: input.slug ? slugify(input.slug) : slugify(input.title),
          summary: input.summary ?? '',
          content: input.content ? JSON.stringify(input.content) : JSON.stringify([]),
          status: input.status ?? 'draft',
          category_id: input.category_id ?? null,
          image_url: input.image_url ?? null,
          author_id: input.author_id ?? null,
          published_at: input.published_at ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        };

        const { data, error: insertError } = await supabase
          .from('news_articles')
          .insert(payload)
          .select(
            `
              *,
              category:news_categories(*),
              author:profiles(id, first_name, last_name, avatar_url),
              news_article_tags(
                tag_id,
                news_tags(*)
              )
            `
          )
          .single();

        if (insertError) throw insertError;

        if (input.tag_ids) {
          await syncArticleTags(data.id, input.tag_ids);
        }

        await fetchArticles();
        return { success: true as const, data: normalizeArticle(data) };
      } catch (err) {
        console.error('Error creating news article:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchArticles]
  );

  const updateArticle = useCallback(
    async (id: string, updates: UpsertNewsArticleInput) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { tag_ids, ...rest } = updates;
        const payload: Record<string, unknown> = {
          ...rest,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        };

        if (rest.title && !rest.slug) {
          payload.slug = slugify(rest.title);
        }

        if (rest.slug) {
          payload.slug = slugify(rest.slug);
        }

        if (rest.content) {
          payload.content = JSON.stringify(rest.content);
        }

        if (rest.status === 'published' && !rest.published_at) {
          payload.published_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase.from('news_articles').update(payload).eq('id', id);
        if (updateError) throw updateError;

        if (tag_ids) {
          await syncArticleTags(id, tag_ids);
        }

        await fetchArticles();
        return { success: true as const };
      } catch (err) {
        console.error('Error updating news article:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchArticles]
  );

  const deleteArticle = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('news_articles').delete().eq('id', id);
        if (deleteError) throw deleteError;
        await fetchArticles();
        return { success: true as const };
      } catch (err) {
        console.error('Error deleting news article:', err);
        return { success: false as const, error: err };
      }
    },
    [fetchArticles]
  );

  const fetchArticleBySlug = useCallback(async (slug: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('news_articles')
        .select(
          `
            *,
            category:news_categories(*),
            author:profiles(id, first_name, last_name, avatar_url),
            news_article_tags(
              tag_id,
              news_tags(*)
            )
          `
        )
        .eq('slug', slug)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) return { success: false as const, error: new Error('Article non trouvé') };

      return { success: true as const, data: normalizeArticle(data) };
    } catch (err) {
      console.error('Error fetching article by slug:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const fetchArticleById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('news_articles')
        .select(
          `
            *,
            category:news_categories(*),
            author:profiles(id, first_name, last_name, avatar_url),
            news_article_tags(
              tag_id,
              news_tags(*)
            )
          `
        )
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) return { success: false as const, error: new Error('Article non trouvé') };

      return { success: true as const, data: normalizeArticle(data) };
    } catch (err) {
      console.error('Error fetching article by id:', err);
      return { success: false as const, error: err };
    }
  }, []);

  const uploadNewsImage = useCallback(async (file: File) => {
    const fileName = `article-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('news').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Error uploading news image:', error);
      return { success: false as const, error };
    }

    const publicUrl = supabase.storage.from('news').getPublicUrl(data.path).data.publicUrl;
    return { success: true as const, url: publicUrl, path: data.path };
  }, []);

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    articles,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    fetchArticles,
    fetchArticleBySlug,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadNewsImage,
  };
}
