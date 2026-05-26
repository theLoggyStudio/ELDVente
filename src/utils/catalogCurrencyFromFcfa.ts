import fcfaCatalogRates from '../constants/json/fcfaCatalogRates.json';
import { formatPrice } from './formatPrice';

type RatesFile = {
  disclaimerFr: string;
  paymentDisclaimerFr?: string;
  fallbackCountry: string;
  paymentProviders?: Record<
    string,
    {
      label: string;
      supportsXofSettlement?: boolean;
      supportsXafSettlement?: boolean;
      requiresConversionFromXof?: boolean;
      conversionCurrency?: string;
      envKeys?: string[];
    }
  >;
  countries: Record<
    string,
    { currency: string; fcfaPerUnit: number; paymentMethods?: string[] }
  >;
};

const rates = fcfaCatalogRates as RatesFile;

const normalizeCountry = (code: string): string => {
  const c = code.trim().toUpperCase();
  return /^[A-Z]{2}$/u.test(c) ? c : 'SN';
};

const fractionDigits = (currency: string): number =>
  currency === 'XOF' || currency === 'XAF' || currency === 'JPY' ? 0 : 2;

const entryFor = (countryCode: string) => {
  const c = normalizeCountry(countryCode);
  const row = rates.countries[c];
  if (row && row.fcfaPerUnit > 0) return row;
  const fb = normalizeCountry(rates.fallbackCountry);
  return rates.countries[fb] ?? { currency: 'USD', fcfaPerUnit: 620 };
};

/** Texte d’avertissement (taux indicatifs) — lu depuis le JSON. */
export const getCatalogCurrencyDisclaimer = (): string => rates.disclaimerFr;
export const getCatalogPaymentDisclaimer = (): string => rates.paymentDisclaimerFr ?? '';

const providerLabelFromId = (id: string): string =>
  rates.paymentProviders?.[id]?.label ?? id.split('_').join(' ');

export const getCountryPaymentMethodsLabel = (countryCode: string): string => {
  const row = entryFor(countryCode);
  const methods = row.paymentMethods ?? ['card_international'];
  const labels = methods.map(providerLabelFromId);
  return labels.join(' / ');
};

/**
 * Affiche un montant catalogue à partir du FCFA de référence.
 * `fcfaPerUnit` dans le JSON = nombre de FCFA pour 1 unité de la devise locale (ex. 656 FCFA = 1 €).
 */
export const formatCatalogPriceFromFcfa = (
  amountFcfa: number,
  countryCode: string,
): { main: string; sub?: string } => {
  const fcfa = Number.isFinite(amountFcfa) && amountFcfa >= 0 ? amountFcfa : 0;
  const { currency, fcfaPerUnit } = entryFor(countryCode);
  const value = fcfaPerUnit > 0 ? fcfa / fcfaPerUnit : fcfa;
  const fmt = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits(currency),
    maximumFractionDigits: fractionDigits(currency),
  });
  const main = fmt.format(Number.isFinite(value) ? value : 0);
  const sub =
    currency !== 'XOF' && currency !== 'XAF' ? formatPrice(Math.round(fcfa)) : undefined;
  return { main, sub };
};
