/**
 * Aligné sur `ELDBack` → `DOHONE_COUNTRY_CODES` (défaut GA,TD,CF,CG,GQ).
 * Sert à afficher / valider le téléphone côté vente pour le paiement Dohone.
 */
const raw = (import.meta.env.VITE_DOHONE_COUNTRY_CODES as string | undefined)?.trim() || 'GA,TD,CF,CG,GQ';

export const dohoneCountryIsoCodes = new Set(
  raw
    .split(/[\s,;]+/u)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
);

export const isDohoneCountry = (iso: string): boolean =>
  dohoneCountryIsoCodes.has(iso.trim().toUpperCase());

export type BillingCurrency = 'XOF' | 'EUR' | 'USD';

/** Code pays ISO pour l’API paiement (EUR→FR, USD→US, CFA→`VITE_XOF_PAYMENT_COUNTRY` ou SN). */
export const paymentCountryFromBilling = (c: BillingCurrency): string => {
  if (c === 'EUR') return 'FR';
  if (c === 'USD') return 'US';
  const fromEnv = (import.meta.env.VITE_XOF_PAYMENT_COUNTRY as string | undefined)?.trim().toUpperCase();
  if (fromEnv && /^[A-Z]{2}$/u.test(fromEnv)) return fromEnv;
  return 'SN';
};
