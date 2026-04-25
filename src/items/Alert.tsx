import { useEffect } from 'react';
import {
  COULEUR_BLANC,
  COULEUR_NOIR,
  COULEUR_PRINCIPALE,
  Z_INDEX_ALERT,
} from '../constants/ts/Couleur.constant';

export type AlertVariant = 'error' | 'success';

type AlertProps = {
  variant: AlertVariant;
  message: string;
  closeLabel: string;
  onClose: () => void;
  /** Fermeture automatique après X ms (ex. succès). */
  autoCloseMs?: number;
};

export const Alert = ({ variant, message, closeLabel, onClose, autoCloseMs }: AlertProps) => {
  useEffect(() => {
    if (!autoCloseMs || autoCloseMs <= 0) return;
    const t = window.setTimeout(() => onClose(), autoCloseMs);
    return () => window.clearTimeout(t);
  }, [autoCloseMs, onClose]);

  const bg = variant === 'success' ? COULEUR_PRINCIPALE : COULEUR_BLANC;
  const fg = COULEUR_NOIR;

  return (
    <div
      className="el-item position-fixed start-50 translate-middle-x border border-2 rounded-3 shadow px-3 py-2 d-flex align-items-start gap-2"
      style={{
        top: '1rem',
        zIndex: Z_INDEX_ALERT,
        maxWidth: 'min(90vw, 28rem)',
        backgroundColor: bg,
        borderColor: COULEUR_NOIR,
        color: fg,
      }}
      role="alert"
    >
      <p className="mb-0 small flex-grow-1" style={{ color: fg }}>
        {message}
      </p>
      <button
        type="button"
        className="btn btn-sm border-0 bg-transparent flex-shrink-0 lh-1 px-1"
        style={{ color: fg }}
        aria-label={closeLabel}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
};
