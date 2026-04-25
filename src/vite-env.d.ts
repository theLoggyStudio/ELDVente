/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `false` = URL absolue sandbox/prod (`.env`). Par défaut ou toute autre valeur = chemins `/paydunya-*-api` (proxy Vite dev/preview).
   */
  readonly VITE_PAYDUNYA_USE_RELATIVE_PROXY?: string;
  readonly PAYDUNIA_STORE_NOM: string;
  readonly PAYDUNIA_STORE_TAG: string;
  readonly PAYDUNIA_STORE_BP: string;
  readonly PAYDUNIA_STORE_TELEPHONE: string;
  readonly PAYDUNIA_VENDEUR_NOM: string;
  readonly PAYDUNIA_VENDEUR_EMAIL: string;
  readonly PAYDUNIA_PRODUIT_NOM: string;
  readonly PAYDUNIA_PRODUIT_PRIX_DEFFAUT: string;
  readonly PAYDUNIA_PRODUIT_MONNAIE: string;
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
  readonly PAYDUNIA_NOTIFICATION_URL: string;

  /** EmailJS — clé publique (compte → API keys). */
  readonly EMAILJS_PUBLIC_KEY?: string;
  /** EmailJS — identifiant du service mail. */
  readonly EMAILJS_SERVICE_ID?: string;
  /** EmailJS — identifiant du modèle de message. */
  readonly EMAILJS_TEMPLATE_ID?: string;
}
