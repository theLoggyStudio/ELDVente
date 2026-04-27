import type { ReactNode } from 'react';
import { COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type HeaderProps = {
  title: string;
  children?: ReactNode;
};

export const Header = ({ title, children }: HeaderProps) => {
  return (
    <header
      className="el-item navbar navbar-expand-md shadow-sm border-bottom"
      style={{ backgroundColor: COULEUR_PRINCIPALE, borderColor: COULEUR_NOIR }}
    >
      <div className="container py-3">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <h1 className="h4 mb-0 fw-bold" style={{ color: COULEUR_NOIR }}>
            {title}
          </h1>
          {children ? (
            <div className="w-100" style={{ maxWidth: 420 }}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
