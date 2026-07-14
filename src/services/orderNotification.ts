import type { ArticleItem } from '../types/Article';

/** Données stockées avant redirection paiement, consommées au retour `?paiement=ok`. */
export const POST_PAY_DELIVERY_STORAGE_KEY = 'elladarie_post_pay_delivery';

export type PendingDeliveryPayload = {
  article: ArticleItem;
  assisted: boolean;
  totalAmount: number;
  optionsSummary: string;
  buyerEmail?: string;
};

export const savePendingDelivery = (p: PendingDeliveryPayload): void => {
  try {
    sessionStorage.setItem(POST_PAY_DELIVERY_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota / mode privé */
  }
};

export const clearPendingDelivery = (): void => {
  try {
    sessionStorage.removeItem(POST_PAY_DELIVERY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const readPendingDelivery = (): PendingDeliveryPayload | null => {
  try {
    const raw = sessionStorage.getItem(POST_PAY_DELIVERY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingDeliveryPayload;
  } catch {
    return null;
  }
};
