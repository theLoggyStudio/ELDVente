import { PAYS_PAIEMENT } from './PaysPaiement.index';
import { isPaydunyaCountry } from './PaydunyaCountries.constant';

/** Pays additionnels pour le routage Dohone (alignés sur le backend). */
const PAYS_EXTRA_CHECKOUT: Array<{ code: string; libelle: string }> = [
  { code: 'TD', libelle: 'Tchad' },
  { code: 'CF', libelle: 'République centrafricaine' },
  { code: 'CG', libelle: 'Congo-Brazzaville' },
  { code: 'GQ', libelle: 'Guinée équatoriale' },
];

/** Liste fusionnée pour le sélecteur pays de l’offcanvas (tri FR). */
export const PAYS_CHECKOUT_OFFCANVAS: Array<{ code: string; libelle: string }> = (() => {
  const m = new Map(PAYS_PAIEMENT.map((p) => [p.code, p]));
  for (const e of PAYS_EXTRA_CHECKOUT) {
    if (!m.has(e.code)) m.set(e.code, e);
  }
  return [...m.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
})();

/** Code spécial de l’option « Autre… » : paiement par carte bancaire (hors PayDunya). */
export const PAYS_AUTRE_CODE = 'AUTRE';

/**
 * Options du sélecteur de l’offcanvas : uniquement les pays couverts par PayDunya
 * (tri FR), avec « Autre… » en dernière position pour le paiement par carte.
 */
export const PAYS_CHECKOUT_PAYDUNYA: Array<{ code: string; libelle: string }> = [
  ...PAYS_CHECKOUT_OFFCANVAS.filter((p) => isPaydunyaCountry(p.code)),
  { code: PAYS_AUTRE_CODE, libelle: 'Autre…' },
];
