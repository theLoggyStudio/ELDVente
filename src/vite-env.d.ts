/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `false` = URL absolue sandbox/prod (`.env`). Par défaut ou toute autre valeur = chemins `/paydunya-*-api` (proxy Vite dev/preview).
   */
  readonly VITE_PAYDUNYA_USE_RELATIVE_PROXY?: string;
  /** Optionnel : surcharge du nom boutique PayDunya (défaut dans le code : « EllaDarie »). */
  readonly PAYDUNIA_STORE_NOM?: string;
  /** Optionnel : préfixe description facture (défaut : « Commande EllaDarie »). */
  readonly PAYDUNIA_PRODUIT_NOM?: string;
  readonly PAYDUNIA_MASTER_KEY: string;
  readonly PAYDUNIA_TEST_URL: string;
  readonly PAYDUNIA_TEST_PUBLIC_KEY: string;
  readonly PAYDUNIA_TEST_PRIVATE_KEY: string;
  readonly PAYDUNIA_TEST_TOKEN: string;
  readonly PAYDUNIA_PRODUCTION_URL: string;
  readonly PAYDUNIA_PRODUCTION_PUBLIC_KEY: string;
  readonly PAYDUNIA_PRODUCTION_PRIVATE_KEY: string;
  readonly PAYDUNIA_PRODUCTION_TOKEN: string;
  readonly PAYDUNIA_MODE: string;
}
