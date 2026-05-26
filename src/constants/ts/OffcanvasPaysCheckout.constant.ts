import { PAYS_PAIEMENT } from './PaysPaiement.index';

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
