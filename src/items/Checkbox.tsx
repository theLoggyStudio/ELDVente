import { COULEUR_NOIR } from '../constants/ts/Couleur.constant';

type CheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export const Checkbox = ({ id, checked, onChange, label }: CheckboxProps) => {
  return (
    <div className="form-check el-item">
      <input
        className="form-check-input border-2"
        style={{ borderColor: COULEUR_NOIR }}
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label className="form-check-label small" htmlFor={id} style={{ color: COULEUR_NOIR }}>
        {label}
      </label>
    </div>
  );
};
