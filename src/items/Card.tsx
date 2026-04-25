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
      className="el-item d-flex flex-column flex-sm-row h-100 overflow-hidden border border-2 rounded-4 shadow-sm cursor-pointer"
      style={{
        backgroundColor: COULEUR_BLANC,
        borderColor: COULEUR_NOIR,
        minHeight: 220,
      }}
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
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0 border-bottom border-sm-0 border-sm-end"
        style={{
          borderColor: COULEUR_NOIR,
          backgroundColor: COULEUR_BLANC,
          flex: '1 1 42%',
          minHeight: 180,
        }}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-100 h-100 p-2"
          style={{ objectFit: 'contain', maxHeight: 220 }}
          loading="lazy"
        />
      </div>

      <div
        className="d-flex flex-column flex-grow-1 p-3 p-sm-4"
        style={{ backgroundColor: COULEUR_PRINCIPALE, flex: '1 1 58%', minWidth: 0 }}
      >
        <h2
          className="fw-bold text-uppercase mb-2 lh-sm"
          style={{ color: COULEUR_BLANC, fontSize: 'clamp(0.85rem, 2.2vw, 1.1rem)' }}
        >
          {title}
        </h2>
        {category ? (
          <p className="small mb-2" style={{ color: COULEUR_NOIR }}>
            {category}
          </p>
        ) : null}
        <p className="fw-bold mb-2" style={{ color: COULEUR_NOIR, fontSize: 'clamp(1rem, 2.5vw, 1.35rem)' }}>
          {priceLine}
        </p>
        <p className="small flex-grow-1 mb-3" style={{ color: COULEUR_NOIR, lineHeight: 1.35 }}>
          {subtitle}
        </p>
        <span
          className="btn border-2 fw-semibold w-100 mt-auto user-select-none"
          style={{
            backgroundColor: COULEUR_BLANC,
            color: COULEUR_NOIR,
            borderColor: COULEUR_NOIR,
          }}
        >
          {triggerLabel}
        </span>
      </div>
    </div>
  );
};
