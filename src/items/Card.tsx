import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type CardProps = {
  title: string;
  category?: string;
  /** Prix catalogue (texte déjà formaté, ex. depuis `formatPrice`). */
  priceLine: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  onOpen: () => void;
  triggerLabel: string;
};

export const Card = ({
  title,
  category,
  priceLine,
  subtitle,
  imageUrl,
  imageAlt,
  onOpen,
  triggerLabel,
}: CardProps) => {
  return (
    <div
      className="el-item card h-100 shadow-sm border-2"
      style={{ borderColor: COULEUR_NOIR }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="ratio ratio-16x9" style={{ backgroundColor: COULEUR_BLANC }}>
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-100 h-100 p-2"
          style={{ objectFit: 'contain' }}
          loading="lazy"
        />
      </div>

      <div className="card-body d-flex flex-column" style={{ backgroundColor: COULEUR_PRINCIPALE }}>
        <h2 className="card-title h6 fw-bold text-uppercase mb-2 lh-sm" style={{ color: COULEUR_BLANC }}>
          {title}
        </h2>
        {category ? (
          <span className="badge mb-2 align-self-start" style={{ backgroundColor: COULEUR_BLANC, color: COULEUR_NOIR }}>
            {category}
          </span>
        ) : null}
        <p className="fw-bold mb-2" style={{ color: COULEUR_NOIR }}>{priceLine}</p>
        <p className="small flex-grow-1 mb-3" style={{ color: COULEUR_NOIR }}>{subtitle}</p>
        <span className="btn w-100 mt-auto user-select-none" style={{ backgroundColor: COULEUR_BLANC, color: COULEUR_NOIR, border: `2px solid ${COULEUR_NOIR}` }}>
          {triggerLabel}
        </span>
      </div>
    </div>
  );
};
