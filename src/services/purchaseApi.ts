import type { PurchaseItem } from '../types/Purchase';
import { apiRequest } from './apiClient';

export const purchaseApi = {
  list: (token: string) =>
    apiRequest<PurchaseItem[]>('/purchases', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (payload: { applicationName: string; buyerEmail?: string }) =>
    apiRequest<PurchaseItem>('/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
