import {
  DEVISE_SYMBOLE,
  FORMAT_DECIMALS,
  SEPARATEUR_DECIMAL,
} from '../constants/ts/Payement.constant';

export const formatPrice = (amount: number): string => {
  const fixed = amount.toFixed(FORMAT_DECIMALS).replace('.', SEPARATEUR_DECIMAL);
  return `${fixed} ${DEVISE_SYMBOLE}`;
};
