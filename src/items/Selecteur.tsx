import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

export type SelecteurOption = {
  nom: string;
  estAssiste: boolean;
};

type SelecteurProps = {
  options: [SelecteurOption, SelecteurOption];
  assisted: boolean;
  onChange: (assisted: boolean) => void;
  /** Fond blanc sur panneau jaune (#F5C527) pour garder le contraste. */
  variant?: 'default' | 'embed';
};

export const Selecteur = ({ options, assisted, onChange, variant = 'default' }: SelecteurProps) => {
  const left = options[0];
  const right = options[1];
  const track = variant === 'embed' ? COULEUR_BLANC : COULEUR_PRINCIPALE;

  return (
    <div
      className="el-item position-relative overflow-hidden rounded-pill border border-2"
      style={{
        borderColor: COULEUR_NOIR,
        backgroundColor: track,
        minHeight: 48,
      }}
    >
      <div
        className="position-absolute top-0 start-0 h-100 rounded-pill transition-transform"
        style={{
          width: '50%',
          backgroundColor: COULEUR_NOIR,
          transform: assisted ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform 0.25s ease',
        }}
        aria-hidden
      />
      <div className="position-relative d-flex h-100">
        <button
          type="button"
          className="btn border-0 flex-fill rounded-0 py-2 px-2 fw-semibold text-center"
          style={{
            backgroundColor: 'transparent',
            color: !assisted ? COULEUR_BLANC : COULEUR_NOIR,
            zIndex: 1,
          }}
          onClick={() => onChange(false)}
          aria-pressed={!assisted}
        >
          {left.nom}
        </button>
        <button
          type="button"
          className="btn border-0 flex-fill rounded-0 py-2 px-2 fw-semibold text-center"
          style={{
            backgroundColor: 'transparent',
            color: assisted ? COULEUR_BLANC : COULEUR_NOIR,
            zIndex: 1,
          }}
          onClick={() => onChange(true)}
          aria-pressed={assisted}
        >
          {right.nom}
        </button>
      </div>
    </div>
  );
};
