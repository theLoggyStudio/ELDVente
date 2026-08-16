/**
 * Pays réellement couverts par PayDunya (doc officielle SoftPay) :
 * Sénégal, Côte d’Ivoire, Bénin, Burkina Faso, Togo, Mali, Cameroun.
 * Sert au sélecteur pays de l’offcanvas ; les autres pays passent par « Autre… » (carte FeexPay).
 */
const raw =
  (import.meta.env.VITE_PAYDUNYA_COUNTRY_CODES as string | undefined)?.trim() ||
  'SN,CI,BJ,BF,TG,ML,CM';

export const paydunyaCountryIsoCodes = new Set(
  raw
    .split(/[\s,;]+/u)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
);

export const isPaydunyaCountry = (iso: string): boolean =>
  paydunyaCountryIsoCodes.has(iso.trim().toUpperCase());
