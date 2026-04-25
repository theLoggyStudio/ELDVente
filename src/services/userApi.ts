import type { UserItem } from '../types/User';
import { apiRequest } from './apiClient';

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const userApi = {
  list: (token: string) => apiRequest<Array<UserItem & { id: number }>>('/users', { headers: authHeaders(token) }),
  create: (payload: UserItem, token: string) =>
    apiRequest<UserItem & { id: number }>('/users', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<UserItem>, token: string) =>
    apiRequest<UserItem & { id: number }>(`/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  remove: (id: number, token: string) =>
    apiRequest<void>(`/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
};
