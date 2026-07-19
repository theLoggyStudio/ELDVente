import { API_BASE_URL } from '../constants/ts/Keys.constant';
import type { PurchaseItem } from '../types/Purchase';
import { apiRequest } from './apiClient';

/** URL de retrait à usage unique : le backend consomme le jeton puis redirige vers le fichier. */
export const oneTimeDownloadUrl = (token: string): string => `${API_BASE_URL}/downloads/${token}`;

export const purchaseApi = {
  list: (token: string) =>
    apiRequest<PurchaseItem[]>('/purchases', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (payload: { applicationName: string; buyerEmail?: string; articleId?: number }) =>
    apiRequest<PurchaseItem & { downloadToken?: string | null }>('/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
