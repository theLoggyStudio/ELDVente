import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

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
      ? { backgroundColor: COULEUR_NOIR, borderColor: COULEUR_NOIR, color: COULEUR_BLANC }
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
