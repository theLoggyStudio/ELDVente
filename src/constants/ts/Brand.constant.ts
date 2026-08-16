import elladarieLogo from '../../assets/logo.png';

/**
 * Logo par défaut du site après build Vite.
 * Source unique : `src/assets/logo.png` (hashé dans `dist/assets/`).
 */
export const ELLADARIE_DEFAULT_LOGO = elladarieLogo;

/**
 * Résout l’image d’un article.
 * Sans URL valide → logo EllaDarie par défaut.
 * Assets Autodesk génériques (logo « A ») → logo EllaDarie.
 * Les favicons gstatic pointant vers un site éditeur restent affichés.
 */
export const resolveArticleImageUrl = (url?: string | null): string => {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return ELLADARIE_DEFAULT_LOGO;

  const u = trimmed.toLowerCase();
  const isGstaticFavicon = u.includes('gstatic.com/favicon');
  if (u.includes('damassets.autodesk.net') || (isGstaticFavicon && u.includes('autodesk'))) {
    return ELLADARIE_DEFAULT_LOGO;
  }

  return trimmed;
};
