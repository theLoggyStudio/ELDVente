import { useId } from 'react';
import { COULEUR_BLANC, COULEUR_NOIR } from '../constants/ts/Couleur.constant';

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  label?: string;
  hint?: string;
  id?: string;
  type?: 'search' | 'email' | 'text' | 'password' | 'tel';
  autoComplete?: string;
};

export const Input = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  label,
  hint,
  id,
  type = 'search',
  autoComplete,
}: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="form-label small fw-semibold mb-1" style={{ color: COULEUR_NOIR }}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type={type}
        className="el-item form-control rounded-pill px-3 shadow-sm"
        style={{ backgroundColor: COULEUR_BLANC, color: COULEUR_NOIR, borderColor: COULEUR_NOIR }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        autoComplete={autoComplete}
      />
      {hint ? (
        <div id={`${inputId}-hint`} className="form-text small mt-1" style={{ color: COULEUR_NOIR, opacity: 0.7 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
};
