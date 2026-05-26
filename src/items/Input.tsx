import { COULEUR_BLANC, COULEUR_NOIR } from '../constants/ts/Couleur.constant';

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  type?: 'search' | 'email' | 'text' | 'password' | 'tel';
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
      className="el-item form-control rounded-pill px-3 shadow-sm"
      style={{ backgroundColor: COULEUR_BLANC, color: COULEUR_NOIR, borderColor: COULEUR_NOIR }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete={autoComplete}
    />
  );
};
