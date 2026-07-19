import type { ArticleItem } from '../types/Article';

export type ArticlePageResponse = {
  items: Array<ArticleItem & { id?: number }>;
  total: number;
  page: number;
  pageSize: number;
};

type CacheEntry = ArticlePageResponse & { fetchedAt: number };

const TTL_MS = 60_000;
const store = new Map<string, CacheEntry>();

export const catalogCacheKey = (page: number, limit: number, q: string): string =>
  `${page}|${limit}|${q.trim().toLowerCase()}`;

export const getCatalogCache = (key: string): ArticlePageResponse | null => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  const { fetchedAt: _fetchedAt, ...page } = entry;
  return page;
};

export const setCatalogCache = (key: string, page: ArticlePageResponse): void => {
  store.set(key, { ...page, fetchedAt: Date.now() });
};

export const invalidateCatalogCache = (): void => {
  store.clear();
};
