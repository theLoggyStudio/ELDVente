import { apiRequest } from './apiClient';

export type PaymentQuote = {
  amountFcfa: number;
  countryCode: string;
  displayCurrency: string;
  localAmount: number;
  localAmountFormatted: string;
  disclaimer: string;
  paydunyaSupported: boolean;
  dohoneSupported?: boolean;
  provider: 'paydunya' | 'dohone' | 'none';
};

export type CheckoutResponse =
  | { provider: 'paydunya' | 'dohone'; checkoutUrl: string; hint?: string };

export type PaydunyaConfirmResponse = {
  status: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
};

const normalizeCountryCode = (countryCode: string): string => {
  const s = countryCode.trim().toUpperCase();
  return /^[A-Z]{2}$/u.test(s) ? s : 'SN';
};

export const paymentApi = {
  quote: (amountFcfa: number, countryCode: string) =>
    apiRequest<PaymentQuote>('/payment/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountFcfa, countryCode: normalizeCountryCode(countryCode) }),
    }),

  checkout: (params: {
    amountFcfa: number;
    countryCode: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    /** Obligatoire pour les pays Dohone (CEMAC, etc.). */
    phone?: string;
  }) =>
    apiRequest<CheckoutResponse>('/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        countryCode: normalizeCountryCode(params.countryCode),
        phone: params.phone?.trim() ?? '',
      }),
    }),

  /** Récupère l’e-mail (et infos client) saisis sur la page de paiement PayDunya. */
  confirmPaydunya: (invoiceToken: string) =>
    apiRequest<PaydunyaConfirmResponse>(
      `/payment/paydunya/confirm?token=${encodeURIComponent(invoiceToken.trim())}`,
    ),
};
