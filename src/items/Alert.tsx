import { useEffect } from 'react';
import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE, Z_INDEX_ALERT } from '../constants/ts/Couleur.constant';

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

  const bgColor = variant === 'success' ? COULEUR_PRINCIPALE : COULEUR_BLANC;

  return (
    <div
      className="el-item alert alert-dismissible fade show position-fixed start-50 translate-middle-x shadow px-3 py-2 mb-0"
      style={{
        top: '1rem',
        zIndex: Z_INDEX_ALERT,
        maxWidth: 'min(90vw, 28rem)',
        backgroundColor: bgColor,
        color: COULEUR_NOIR,
        border: `2px solid ${COULEUR_NOIR}`,
      }}
      role="alert"
    >
      <p className="mb-0 small pe-4">{message}</p>
      <button
        type="button"
        className="btn-close"
        aria-label={closeLabel}
        onClick={onClose}
      />
    </div>
  );
};
