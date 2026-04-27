import { forwardRef, type ReactNode } from 'react';
import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type OffcanvasProps = {
  id: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
};

export const Offcanvas = forwardRef<HTMLDivElement, OffcanvasProps>(
  ({ id, title, closeLabel, children, footer }, ref) => {
    return (
      <div
        ref={ref}
        className="el-item offcanvas offcanvas-start border-end d-flex flex-column shadow"
        tabIndex={-1}
        id={id}
        aria-labelledby={`${id}-label`}
        style={{ backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR }}
      >
        <div className="offcanvas-header border-bottom" style={{ backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR }}>
          <h2 className="offcanvas-title h5 fw-bold" id={`${id}-label`} style={{ color: COULEUR_NOIR }}>
            {title}
          </h2>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label={closeLabel}
          />
        </div>
        <div className="offcanvas-body d-flex flex-column flex-grow-1">{children}</div>
        {footer ? (
          <div className="border-top p-3 mt-auto" style={{ backgroundColor: COULEUR_PRINCIPALE, borderColor: COULEUR_NOIR }}>
            {footer}
          </div>
        ) : null}
      </div>
    );
  }
);

Offcanvas.displayName = 'Offcanvas';
