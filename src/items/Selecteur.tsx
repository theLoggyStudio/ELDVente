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
  const wrapperClass = variant === 'embed' ? 'bg-light border rounded p-1' : '';
  const wrapperStyle = variant === 'embed' ? { backgroundColor: COULEUR_BLANC, borderColor: COULEUR_NOIR } : undefined;

  return (
    <div className={`el-item btn-group w-100 ${wrapperClass}`} style={wrapperStyle} role="group" aria-label="Choix de formule">
      <button
        type="button"
        className="btn"
        style={{
          backgroundColor: !assisted ? COULEUR_NOIR : 'transparent',
          color: !assisted ? COULEUR_BLANC : COULEUR_NOIR,
          borderColor: COULEUR_NOIR,
        }}
        onClick={() => onChange(false)}
        aria-pressed={!assisted}
      >
        {left.nom}
      </button>
      <button
        type="button"
        className="btn"
        style={{
          backgroundColor: assisted ? COULEUR_PRINCIPALE : 'transparent',
          color: assisted ? COULEUR_BLANC : COULEUR_NOIR,
          borderColor: COULEUR_NOIR,
        }}
        onClick={() => onChange(true)}
        aria-pressed={assisted}
      >
        {right.nom}
      </button>
    </div>
  );
};
