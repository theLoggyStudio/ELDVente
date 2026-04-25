/**
 * Devise et format d’affichage.
 * Variables PayDunya : valeurs lues depuis l’environnement (fichier `.env`, préfixe PAYDUNIA_).
 */

export const DEVISE_SYMBOLE = 'FCFA';
export const FORMAT_DECIMALS = 0;
export const SEPARATEUR_DECIMAL = ',';

/** Supplément FCFA appliqué lorsque la formule « avec assistance » est choisie. */
export const SUPPLEMENT_ASSISTANCE_FCFA = 5000;

const env = import.meta.env;

export const PAYDUNIA_STORE_NOM = (env.PAYDUNIA_STORE_NOM as string | undefined) ?? '';
export const PAYDUNIA_STORE_TAG = (env.PAYDUNIA_STORE_TAG as string | undefined) ?? '';
export const PAYDUNIA_STORE_BP = (env.PAYDUNIA_STORE_BP as string | undefined) ?? '';
export const PAYDUNIA_STORE_TELEPHONE = (env.PAYDUNIA_STORE_TELEPHONE as string | undefined) ?? '';

export const PAYDUNIA_VENDEUR_NOM = (env.PAYDUNIA_VENDEUR_NOM as string | undefined) ?? '';
export const PAYDUNIA_VENDEUR_EMAIL = (env.PAYDUNIA_VENDEUR_EMAIL as string | undefined) ?? '';

/** POST JSON optionnel (backend qui envoie l’e-mail). Si vide, utilisation de `mailto:` vers le vendeur. */
export const PAYDUNIA_NOTIFICATION_URL = (env.PAYDUNIA_NOTIFICATION_URL as string | undefined)?.trim() ?? '';

export const PAYDUNIA_PRODUIT_NOM = (env.PAYDUNIA_PRODUIT_NOM as string | undefined) ?? '';
export const PAYDUNIA_PRODUIT_PRIX_DEFFAUT = Number(env.PAYDUNIA_PRODUIT_PRIX_DEFFAUT ?? 10_000);
export const PAYDUNIA_PRODUIT_MONNAIE = (env.PAYDUNIA_PRODUIT_MONNAIE as string | undefined) ?? 'XOF';

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
