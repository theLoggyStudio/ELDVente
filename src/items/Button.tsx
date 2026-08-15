import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { COULEUR_NOIR, COULEUR_PRINCIPALE, COULEUR_TEXTE_CLAIR } from '../constants/ts/Couleur.constant';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'pay';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const Button = ({
  children,
  variant = 'primary',
  className = '',
  style,
  ...rest
}: ButtonProps) => {
  const baseStyle =
    variant === 'pay'
      ? { backgroundColor: COULEUR_NOIR, borderColor: COULEUR_NOIR, color: COULEUR_TEXTE_CLAIR }
      : { backgroundColor: COULEUR_PRINCIPALE, borderColor: COULEUR_NOIR, color: COULEUR_NOIR };

  return (
    <button
      type="button"
      className={`btn fw-semibold el-item ${className}`}
      style={{ ...baseStyle, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
};
