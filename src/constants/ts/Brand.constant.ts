/** Logo / bannière EllaDarie servi depuis `public/logo.png`. */
export const ELLADARIE_DEFAULT_LOGO = '/logo.png';

export const resolveArticleImageUrl = (url?: string | null): string => {
  const trimmed = url?.trim() ?? '';
  return trimmed || ELLADARIE_DEFAULT_LOGO;
};
