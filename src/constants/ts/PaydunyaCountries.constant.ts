/**
 * Aligné sur `ELDBack` → `PAYDUNYA_COUNTRY_CODES` (défaut UEMOA + partenaires).
 * Sert à l’indication « PayDunya » dans l’offcanvas (priorité Dohone gérée à part).
 */
const raw =
  (import.meta.env.VITE_PAYDUNYA_COUNTRY_CODES as string | undefined)?.trim() ||
  'SN,CI,ML,BJ,BF,TG,NE,GN,LR,SL,CM,GA,CG,TD,CF,CD,GH,NG';

export const paydunyaCountryIsoCodes = new Set(
  raw
    .split(/[\s,;]+/u)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
);

export const isPaydunyaCountry = (iso: string): boolean =>
  paydunyaCountryIsoCodes.has(iso.trim().toUpperCase());
