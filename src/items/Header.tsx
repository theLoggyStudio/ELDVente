import type { ReactNode } from 'react';
import { ELLADARIE_DEFAULT_LOGO } from '../constants/ts/Brand.constant';
import { COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type HeaderProps = {
  title: string;
  children?: ReactNode;
};

export const Header = ({ title, children }: HeaderProps) => {
  const brandLines = title.split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <header
      className="el-item navbar navbar-expand-md shadow-sm border-bottom"
      style={{ backgroundColor: COULEUR_PRINCIPALE, borderColor: COULEUR_NOIR }}
    >
      <div className="container py-3">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <h1
            className="h4 mb-0 fw-bold d-flex align-items-center gap-2"
            style={{ color: COULEUR_NOIR, lineHeight: 1.25 }}
          >
            <img
              src={ELLADARIE_DEFAULT_LOGO}
              alt="Logo EllaDarie"
              style={{
                width: '120px',
                height: '120px',
                maxWidth: 'none',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <span className="d-flex flex-column align-items-start gap-0">
              {brandLines.map((line, i) => (
                <span
                  key={`${i}-${line.slice(0, 12)}`}
                  className={i === 0 ? '' : 'fw-normal'}
                  style={i === 0 ? undefined : { fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)', opacity: 0.95 }}
                >
                  {line}
                </span>
              ))}
            </span>
          </h1>
          {children ? (
            <div className="w-100 ms-auto d-flex justify-content-end" style={{ maxWidth: 420 }}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
