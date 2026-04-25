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
  const base =
    variant === 'pay'
      ? {
          backgroundColor: COULEUR_NOIR,
          color: COULEUR_BLANC,
          borderColor: COULEUR_NOIR,
        }
      : {
          backgroundColor: COULEUR_PRINCIPALE,
          color: COULEUR_NOIR,
          borderColor: COULEUR_NOIR,
        };

  return (
    <button
      type="button"
      className={`btn border-2 fw-semibold el-item ${className}`}
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
};
