/** Clés / identifiants applicatifs */
export const CLE_SESSION_PANIER = 'elladarie_panier_v1';
export const CLE_AUTH_TOKEN = 'eld_auth_token_v1';

/**
 * Base de l’API REST — définir dans `.env` : `VITE_API_BASE_URL` (sans slash final).
 * Sans variable : URL API déployée par défaut.
 */
const apiRaw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const normalized = apiRaw.replace(/\/$/u, '');
const devFallback = 'http://localhost:4000/api';
const prodFallback = 'https://eld-back-express-ts.vercel.app/api';

export const API_BASE_URL = normalized || (import.meta.env.DEV ? devFallback : prodFallback);