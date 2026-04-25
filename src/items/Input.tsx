import { COULEUR_BLANC, COULEUR_NOIR } from '../constants/ts/Couleur.constant';

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  type?: 'search' | 'email' | 'text';
  autoComplete?: string;
};

export const Input = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  type = 'search',
  autoComplete,
}: InputProps) => {
  return (
    <input
      type={type}
      className="el-item form-control border-2 rounded-pill px-3"
      style={{
        backgroundColor: COULEUR_BLANC,
        color: COULEUR_NOIR,
        borderColor: COULEUR_NOIR,
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete={autoComplete}
    />
  );
};
