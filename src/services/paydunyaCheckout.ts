import {
  PAYDUNIA_MASTER_KEY,
  PAYDUNIA_PRODUCTION_PRIVATE_KEY,
  PAYDUNIA_PRODUCTION_TOKEN,
  PAYDUNIA_PRODUCTION_URL,
  PAYDUNIA_STORE_NOM,
  PAYDUNIA_TEST_PRIVATE_KEY,
  PAYDUNIA_TEST_TOKEN,
  PAYDUNIA_TEST_URL,
  paydunyaIsProduction,
} from '../constants/ts/Payement.constant';

type CreateInvoiceParams = {
  totalAmount: number;
  description: string;
};

/** Chemins relatifs via proxy Vite (dev + preview) sauf si `VITE_PAYDUNYA_USE_RELATIVE_PROXY=false`. */
const usePaydunyaRelativeProxy = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_PAYDUNYA_USE_RELATIVE_PROXY !== 'false';

const resolveCreateUrl = (): string => {
  const prod = paydunyaIsProduction();
  if (usePaydunyaRelativeProxy()) {
    return prod
      ? '/paydunya-production-api/v1/checkout-invoice/create'
      : '/paydunya-sandbox-api/v1/checkout-invoice/create';
  }
  return prod ? PAYDUNIA_PRODUCTION_URL : PAYDUNIA_TEST_URL;
};

const normalizeResponseCode = (raw: unknown): string => {
  if (raw === 0 || raw === '0') return '00';
  return String(raw ?? '');
};

const messageForPaydunyaCode = (code: string, responseText: string | undefined): string | undefined => {
  if (code === '1001') {
    return 'Clés PayDunya invalides : la master key, la clé privée TEST et le token doivent provenir de la même application (PayDunya Business → Intégration).';
  }
  return responseText;
};

export const createPaydunyaCheckoutInvoice = async ({
  totalAmount,
  description,
}: CreateInvoiceParams): Promise<{ ok: true; checkoutUrl: string } | { ok: false; message: string }> => {
  const prod = paydunyaIsProduction();
  const privateKey = prod ? PAYDUNIA_PRODUCTION_PRIVATE_KEY : PAYDUNIA_TEST_PRIVATE_KEY;
  const token = prod ? PAYDUNIA_PRODUCTION_TOKEN : PAYDUNIA_TEST_TOKEN;

  if (!PAYDUNIA_MASTER_KEY || !privateKey || !token) {
    return {
      ok: false,
      message: 'Configuration PayDunya incomplète (master key, clé privée et token).',
    };
  }

  const url = resolveCreateUrl();
  if (!url) {
    return { ok: false, message: 'URL PayDunya manquante.' };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
  const baseUrl = `${origin}${path.startsWith('/') ? path : `/${path}`}`;

  const body = {
    invoice: {
      total_amount: Math.round(totalAmount),
      description,
    },
    store: {
      name: PAYDUNIA_STORE_NOM,
    },
    ...(origin
      ? {
          actions: {
            return_url: `${baseUrl}?paiement=ok`,
            cancel_url: `${baseUrl}?paiement=annule`,
          },
        }
      : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': PAYDUNIA_MASTER_KEY,
      'PAYDUNYA-PRIVATE-KEY': privateKey,
      'PAYDUNYA-TOKEN': token,
    },
    body: JSON.stringify(body),
  });

  let data: {
    response_code?: string | number;
    response_text?: string;
    description?: string;
  };
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      message: res.ok ? 'Réponse PayDunya invalide.' : `Erreur HTTP ${res.status} (réponse non JSON).`,
    };
  }

  const code = normalizeResponseCode(data.response_code);
  if (code === '00' && data.response_text) {
    return { ok: true, checkoutUrl: data.response_text };
  }

  const hint = messageForPaydunyaCode(code, data.response_text) ?? data.response_text;
  return {
    ok: false,
    message: hint || data.description || `Erreur PayDunya (HTTP ${res.status}, code ${code || 'n/d'}).`,
  };
};
