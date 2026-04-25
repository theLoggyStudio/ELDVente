import type { ArticleItem } from '../types/Article';
import { apiRequest } from './apiClient';

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const articleApi = {
  list: () => apiRequest<Array<ArticleItem & { id?: number }>>('/articles'),
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
