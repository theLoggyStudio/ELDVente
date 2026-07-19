import type { ArticleItem } from '../types/Article';
import {
  catalogCacheKey,
  getCatalogCache,
  setCatalogCache,
  type ArticlePageResponse,
} from './articleCatalogCache';
import { apiRequest } from './apiClient';

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export type { ArticlePageResponse };

export type ArticleListParams = {
  page?: number;
  limit?: number;
  q?: string;
};

type ArticleRow = ArticleItem & { id?: number };

const buildListQuery = (params: ArticleListParams & { all?: boolean }): string => {
  const search = new URLSearchParams();
  if (params.all) {
    search.set('all', '1');
  } else {
    if (params.page != null) search.set('page', String(params.page));
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.q?.trim()) search.set('q', params.q.trim());
  }
  const qs = search.toString();
  return qs ? `/articles?${qs}` : '/articles';
};

const matchesQuery = (article: ArticleRow, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    article.nom.toLowerCase().includes(needle) ||
    (article.version ?? '').toLowerCase().includes(needle) ||
    article.categorie.toLowerCase().includes(needle)
  );
};

const sortArticles = (rows: ArticleRow[]): ArticleRow[] =>
  [...rows].sort(
    (a, b) =>
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }) ||
      (a.version ?? '').localeCompare(b.version ?? '', 'fr', { numeric: true }),
  );

/** Compat : ancien backend = tableau ; nouveau = { items, total, page, pageSize }. */
const normalizePageResponse = (
  raw: unknown,
  params: { page: number; limit: number; q: string },
): ArticlePageResponse => {
  if (Array.isArray(raw)) {
    const filtered = sortArticles(raw.filter((row) => matchesQuery(row as ArticleRow, params.q)));
    const start = (params.page - 1) * params.limit;
    return {
      items: filtered.slice(start, start + params.limit),
      total: filtered.length,
      page: params.page,
      pageSize: params.limit,
    };
  }

  if (raw && typeof raw === 'object') {
    const body = raw as Partial<ArticlePageResponse> & { data?: ArticleRow[] };
    const items = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.data)
        ? body.data
        : [];
    const total = typeof body.total === 'number' ? body.total : items.length;
    return {
      items,
      total,
      page: typeof body.page === 'number' ? body.page : params.page,
      pageSize: typeof body.pageSize === 'number' ? body.pageSize : params.limit,
    };
  }

  return {
    items: [],
    total: 0,
    page: params.page,
    pageSize: params.limit,
  };
};

const normalizeAllItems = (raw: unknown): ArticleRow[] => {
  if (Array.isArray(raw)) return raw as ArticleRow[];
  if (raw && typeof raw === 'object') {
    const body = raw as Partial<ArticlePageResponse> & { data?: ArticleRow[] };
    if (Array.isArray(body.items)) return body.items;
    if (Array.isArray(body.data)) return body.data;
  }
  return [];
};

export const articleApi = {
  listPage: async (
    params: ArticleListParams,
    options?: { bypassCache?: boolean },
  ): Promise<ArticlePageResponse> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 6;
    const q = params.q?.trim() ?? '';
    const key = catalogCacheKey(page, limit, q);

    if (!options?.bypassCache) {
      const cached = getCatalogCache(key);
      if (cached) return cached;
    }

    const raw = await apiRequest<unknown>(buildListQuery({ page, limit, q }));
    const result = normalizePageResponse(raw, { page, limit, q });
    setCatalogCache(key, result);
    return result;
  },
  /** Avec `token`, le backend inclut `urlDrive` (réservé à l'admin). */
  listAll: async (token?: string) => {
    const raw = await apiRequest<unknown>(
      buildListQuery({ all: true }),
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    return normalizeAllItems(raw);
  },
  getById: (id: number) => apiRequest<ArticleItem & { id: number }>(`/articles/${id}`),
  create: (payload: ArticleItem, token: string) =>
    apiRequest<ArticleItem & { id: number }>('/articles', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: ArticleItem, token: string) =>
    apiRequest<ArticleItem & { id: number }>(`/articles/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  remove: (id: number, token: string) =>
    apiRequest<void>(`/articles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
};
