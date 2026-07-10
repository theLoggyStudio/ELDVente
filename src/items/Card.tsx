import { useEffect, useState } from 'react';
import { ELLADARIE_DEFAULT_LOGO, resolveArticleImageUrl } from '../constants/ts/Brand.constant';
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
  const [imgSrc, setImgSrc] = useState(() => resolveArticleImageUrl(imageUrl));

  useEffect(() => {
    setImgSrc(resolveArticleImageUrl(imageUrl));
  }, [imageUrl]);

  return (
    <div
      className="el-item el-item-catalog-card d-flex flex-column flex-sm-row overflow-hidden border border-2 rounded-3 shadow-sm cursor-pointer"
      style={{
        backgroundColor: COULEUR_BLANC,
        borderColor: COULEUR_NOIR,
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
        className="el-item-catalog-card__media d-flex align-items-center justify-content-center flex-shrink-0 border-bottom border-sm-0 border-sm-end"
        style={{
          borderColor: COULEUR_NOIR,
          backgroundColor: COULEUR_BLANC,
        }}
      >
        <img
          src={imgSrc}
          alt={imageAlt}
          className="el-item-catalog-card__img p-1"
          loading="lazy"
          onError={() => setImgSrc(ELLADARIE_DEFAULT_LOGO)}
        />
      </div>

      <div
        className="el-item-catalog-card__panel d-flex flex-column p-3 p-sm-2"
        style={{ backgroundColor: COULEUR_PRINCIPALE, minWidth: 0 }}
      >
        <h2 className="el-item-catalog-card__title fw-bold text-uppercase mb-2 lh-sm text-break">
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
        <p className="mb-1" style={{ color: COULEUR_NOIR, lineHeight: 1.3, fontSize: '0.65rem' }}>
          {subtitle}
        </p>

      </div>
    </div>
  );
};
