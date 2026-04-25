import emailjs from '@emailjs/browser';
import pages from '../constants/json/Pages.constant.json';
import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  emailjsIsConfigured,
} from '../constants/ts/Email.constant';
import { PAGE_VENTE } from '../constants/ts/PagesVente.index';
import { PAYDUNIA_NOTIFICATION_URL } from '../constants/ts/Payement.constant';
import type { ArticleItem } from '../types/Article';
import { formatPrice } from '../utils/formatPrice';

const vente = pages.vente;

/** Données stockées avant redirection PayDunya, consommées au retour `?paiement=ok`. */
export const POST_PAY_DELIVERY_STORAGE_KEY = 'eld_logiciel_post_pay_delivery';

export type OrderNotificationPayload = {
  article: ArticleItem;
  assisted: boolean;
  totalAmount: number;
  optionsSummary: string;
  /** Adresse à laquelle envoyer le message de livraison (acheteur). */
  buyerEmail: string;
};

const buildBuyerDeliveryBody = (p: OrderNotificationPayload): string => {
  const lines: string[] = [
    vente[PAGE_VENTE.mailBuyerThanks],
    '',
    `${vente[PAGE_VENTE.mailLineDrive]}${p.article.urlDrive.trim()}`,
  ];
  if (p.assisted) {
    lines.push(`${vente[PAGE_VENTE.mailLineAssistanceTel]}${p.article.tel}`);
  }
  lines.push(
    '',
    `${vente[PAGE_VENTE.mailLineArticle]}${p.article.nom}`,
    `${vente[PAGE_VENTE.mailLineTotal]}${formatPrice(p.totalAmount)}`,
    `${vente[PAGE_VENTE.mailLineOptions]}${p.optionsSummary}`,
  );
  return lines.join('\n');
};

const isValidEmail = (raw: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

/**
 * Prépare l’e-mail de livraison pour l’acheteur (lien Drive + numéro d’assistance si formule avec assistance).
 * - Si EmailJS est configuré (`EMAILJS_*` dans `.env`) : envoi via `@emailjs/browser`.
 * - Sinon si `PAYDUNIA_NOTIFICATION_URL` est défini : POST JSON (backend).
 * - Sinon : ouverture `mailto:` vers l’adresse saisie avec le corps prérempli.
 */
export const sendOrderNotificationEmail = async (
  p: OrderNotificationPayload
): Promise<{ ok: true } | { ok: false; reason: 'no_recipient' | 'popup_blocked' | 'network' }> => {
  const to = p.buyerEmail.trim();
  if (!to) {
    return { ok: false, reason: 'no_recipient' };
  }
  if (!isValidEmail(to)) {
    return { ok: false, reason: 'no_recipient' };
  }

  const body = buildBuyerDeliveryBody(p);
  const subject = `${vente[PAGE_VENTE.mailSubjectBuyerDelivery]}${p.article.nom}`;

  if (emailjsIsConfigured()) {
    try {
      // Le modèle EmailJS doit lier « To Email » à {{to_email}} ou {{email}} (sinon 422 destinataire vide).
      const templateParams: Record<string, string> = {
        to_email: to,
        email: to,
        user_email: to,
        reply_to: to,
        subject,
        message: body,
        article: p.article.nom,
        url_drive: p.article.urlDrive.trim(),
        url_site: p.article.URL,
        assisted: p.assisted ? 'oui' : 'non',
        assistance_tel: p.assisted ? p.article.tel : '',
        total: formatPrice(p.totalAmount),
        options: p.optionsSummary,
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, {
        publicKey: EMAILJS_PUBLIC_KEY,
      });
      return { ok: true };
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error(
          '[EmailJS] envoi refusé — dans le modèle, réglez « To Email » sur {{to_email}} ou {{email}} (erreur 422 = destinataire vide).',
          err,
        );
      }
      return { ok: false, reason: 'network' };
    }
  }

  if (PAYDUNIA_NOTIFICATION_URL) {
    try {
      const res = await fetch(PAYDUNIA_NOTIFICATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          article: p.article.nom,
          urlDrive: p.article.urlDrive.trim(),
          urlSite: p.article.URL,
          tel: p.assisted ? p.article.tel : '',
          assisted: p.assisted,
          totalAmount: p.totalAmount,
          optionsSummary: p.optionsSummary,
        }),
      });
      if (!res.ok) return { ok: false, reason: 'network' };
      return { ok: true };
    } catch {
      return { ok: false, reason: 'network' };
    }
  }

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const w = window.open(mailto, '_blank', 'noopener,noreferrer');
  if (!w) {
    return { ok: false, reason: 'popup_blocked' };
  }
  return { ok: true };
};

export const savePendingDeliveryEmail = (p: OrderNotificationPayload): void => {
  try {
    sessionStorage.setItem(POST_PAY_DELIVERY_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota / mode privé */
  }
};

export const clearPendingDeliveryEmail = (): void => {
  try {
    sessionStorage.removeItem(POST_PAY_DELIVERY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
