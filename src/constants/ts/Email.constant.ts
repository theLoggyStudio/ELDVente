/**
 * Configuration EmailJS (https://www.emailjs.com/).
 * Variables : préfixe `EMAILJS_` dans `.env` (exposées par Vite).
 *
 * Obligatoire dans le tableau de bord EmailJS (modèle → champ « To Email ») :
 * saisir `{{to_email}}` ou `{{email}}` — sinon erreur HTTP 422 « The recipients address is empty ».
 * L’application envoie les deux alias avec l’adresse acheteur.
 */

const env = import.meta.env;

/** Clé publique du compte EmailJS (onglet « Compte » → « API keys »). */
export const EMAILJS_PUBLIC_KEY = (env.EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ?? '';

/** Identifiant du service e-mail relié (Gmail, Outlook, etc.). */
export const EMAILJS_SERVICE_ID = (env.EMAILJS_SERVICE_ID as string | undefined)?.trim() ?? '';

/** Identifiant du modèle utilisé pour la livraison post-achat. */
export const EMAILJS_TEMPLATE_ID = (env.EMAILJS_TEMPLATE_ID as string | undefined)?.trim() ?? '';

/** `true` si les trois identifiants sont renseignés — envoi possible via EmailJS. */
export const emailjsIsConfigured = (): boolean =>
  Boolean(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID);
