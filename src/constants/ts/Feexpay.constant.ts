/**
 * Config FeexPay (paiement par carte bancaire pour l’option « Autre… »).
 * ID boutique et token API : menu Développeur sur feexpay.me.
 */
export const FEEXPAY_SHOP_ID = ((import.meta.env.VITE_FEEXPAY_SHOP_ID as string | undefined) ?? '').trim();

export const FEEXPAY_API_TOKEN = ((import.meta.env.VITE_FEEXPAY_TOKEN as string | undefined) ?? '').trim();

export const FEEXPAY_MODE: 'LIVE' | 'SANDBOX' =
  ((import.meta.env.VITE_FEEXPAY_MODE as string | undefined) ?? '').trim().toUpperCase() === 'SANDBOX'
    ? 'SANDBOX'
    : 'LIVE';

/** Widget affiché uniquement si les clés sont fournies (sinon bouton standard + message). */
export const FEEXPAY_CONFIGURED = FEEXPAY_SHOP_ID.length > 0 && FEEXPAY_API_TOKEN.length > 0;
