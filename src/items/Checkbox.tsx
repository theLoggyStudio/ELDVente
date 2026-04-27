type CheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export const Checkbox = ({ id, checked, onChange, label }: CheckboxProps) => {
  return (
    <div className="form-check el-item py-1">
      <input
        className="form-check-input"
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label className="form-check-label small" htmlFor={id}>
        {label}
      </label>
    </div>
  );
};
