import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type CardProps = {
  title: string;
  category?: string;
  /** Prix catalogue (affiché seulement si fourni). */
  priceLine?: string;
  /** Référence FCFA ou équivalent secondaire (optionnel). */
  priceSecondary?: string;
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
  priceSecondary,
  subtitle,
  imageUrl,
  imageAlt,
  onOpen,
  triggerLabel,
}: CardProps) => {
  return (
    <div
      className="el-item d-flex flex-column flex-sm-row h-100 overflow-hidden border border-2 rounded-3 shadow-sm cursor-pointer"
      style={{
        backgroundColor: COULEUR_BLANC,
        borderColor: COULEUR_NOIR,
        minHeight: 110,
      }}
      role="button"
      tabIndex={0}
      aria-label={triggerLabel}
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
          minHeight: 90,
        }}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-100 h-100 p-1"
          style={{ objectFit: 'contain', maxHeight: 110 }}
          loading="lazy"
        />
      </div>

      <div
        className="d-flex flex-column flex-grow-1 p-3 p-sm-2 "
        style={{ backgroundColor: COULEUR_PRINCIPALE, flex: '1 1 58%', minWidth: 0 }}
      >
        <h2
          className="fw-bold text-uppercase mb-2 lh-sm text-break"
          style={{ color: COULEUR_BLANC, fontSize: 'clamp(1rem, 2.6vw + 0.35rem, 1.45rem)' }}
        >
          {title}
        </h2>
        {category ? (
          <p className="mb-1" style={{ color: COULEUR_NOIR, fontSize: '0.7rem' }}>
            {category}
          </p>
        ) : null}
        {priceLine ? (
          <>
            <p
              className={`fw-bold ${priceSecondary ? 'mb-0' : 'mb-1'}`}
              style={{ color: COULEUR_NOIR, fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)' }}
            >
              {priceLine}
            </p>
            {priceSecondary ? (
              <p className="mb-1" style={{ color: COULEUR_NOIR, fontSize: '0.65rem' }}>
                {priceSecondary}
              </p>
            ) : null}
          </>
        ) : null}
        <p className="flex-grow-1 mb-1" style={{ color: COULEUR_NOIR, lineHeight: 1.3, fontSize: '0.65rem' }}>
          {subtitle}
        </p>

      </div>
    </div>
  );
};
