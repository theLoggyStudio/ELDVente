/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_XOF_PAYMENT_COUNTRY?: string;
  readonly VITE_DOHONE_COUNTRY_CODES?: string;
  readonly VITE_PAYDUNYA_COUNTRY_CODES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
