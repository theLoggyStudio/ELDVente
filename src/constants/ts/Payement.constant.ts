/**
 * Devise et format d’affichage.
 * PayDunya : clés / URLs via `.env` ; nom boutique et libellé facture ont des valeurs par défaut dans le code.
 */

export const DEVISE_SYMBOLE = 'FCFA';
export const FORMAT_DECIMALS = 0;
export const SEPARATEUR_DECIMAL = ',';

/** Supplément FCFA appliqué lorsque la formule « avec assistance » est choisie. */
export const SUPPLEMENT_ASSISTANCE_FCFA = 5000;

const env = import.meta.env;

const trimStr = (v: string | undefined): string => (typeof v === 'string' ? v.trim() : '');

/** Nom affiché côté PayDunya (magasin). */
export const PAYDUNIA_STORE_NOM = trimStr(env.PAYDUNIA_STORE_NOM as string | undefined) || 'EllaDarie';

/** Préfixe de la description de ligne sur la facture (concaténé avec l’article choisi). */
export const PAYDUNIA_PRODUIT_NOM =
  trimStr(env.PAYDUNIA_PRODUIT_NOM as string | undefined) || 'Commande EllaDarie';

export const PAYDUNIA_MASTER_KEY = (env.PAYDUNIA_MASTER_KEY as string | undefined) ?? '';

export const PAYDUNIA_TEST_URL = (env.PAYDUNIA_TEST_URL as string | undefined) ?? '';
export const PAYDUNIA_TEST_PUBLIC_KEY = (env.PAYDUNIA_TEST_PUBLIC_KEY as string | undefined) ?? '';
export const PAYDUNIA_TEST_PRIVATE_KEY = (env.PAYDUNIA_TEST_PRIVATE_KEY as string | undefined) ?? '';
export const PAYDUNIA_TEST_TOKEN = (env.PAYDUNIA_TEST_TOKEN as string | undefined) ?? '';

export const PAYDUNIA_PRODUCTION_URL = (env.PAYDUNIA_PRODUCTION_URL as string | undefined) ?? '';
export const PAYDUNIA_PRODUCTION_PUBLIC_KEY = (env.PAYDUNIA_PRODUCTION_PUBLIC_KEY as string | undefined) ?? '';
export const PAYDUNIA_PRODUCTION_PRIVATE_KEY = (env.PAYDUNIA_PRODUCTION_PRIVATE_KEY as string | undefined) ?? '';
export const PAYDUNIA_PRODUCTION_TOKEN = (env.PAYDUNIA_PRODUCTION_TOKEN as string | undefined) ?? '';

const normalizePaydunyaMode = (raw: string | undefined): 'test' | 'production' => {
  const m = (raw ?? 'test').trim().toLowerCase();
  return m === 'production' ? 'production' : 'test';
};

/**
 * Seul réglage pour basculer sandbox ↔ production PayDunya : variable `PAYDUNIA_MODE` dans `.env`.
 * - `test` (défaut) : API sandbox + clés `PAYDUNIA_TEST_*`
 * - `production` : API live + clés `PAYDUNIA_PRODUCTION_*`
 */
export const PAYDUNIA_MODE: 'test' | 'production' = normalizePaydunyaMode(
  env.PAYDUNIA_MODE as string | undefined,
);

/** `true` = paiements réels (clés et URL de production PayDunya). */
export const paydunyaIsProduction = (): boolean => PAYDUNIA_MODE === 'production';
