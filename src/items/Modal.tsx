import type { ReactNode } from 'react';
import { COULEUR_BLANC, COULEUR_NOIR } from '../constants/ts/Couleur.constant';

type ModalProps = {
  show: boolean;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export const Modal = ({ show, title, closeLabel, children, footer, onClose }: ModalProps) => {
  if (!show) return null;
  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 2000 }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-content shadow"
          style={{ backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR, color: COULEUR_NOIR }}
        >
          <div className="modal-header" style={{ backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR }}>
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label={closeLabel} onClick={onClose} />
          </div>
          <div className="modal-body" style={{ backgroundColor: COULEUR_BLANC }}>{children}</div>
          {footer ? (
            <div className="modal-footer" style={{ backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR }}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
