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
    <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content border-2" style={{ borderColor: COULEUR_NOIR, backgroundColor: COULEUR_BLANC }}>
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label={closeLabel} onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
      <div className="modal-backdrop show" onClick={onClose} />
    </div>
  );
};
