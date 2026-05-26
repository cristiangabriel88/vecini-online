import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * An accessible checkbox built on a native `<input>` (so keyboard and form
 * semantics come for free) with a styled box that matches the design system,
 * mirroring the conventions of `Switch`. The whole label is clickable.
 */
export function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label className="checkbox" data-checked={String(!!checked)} data-disabled={String(!!disabled)}>
      <input
        type="checkbox"
        className="checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox__box" aria-hidden="true">
        <Check className="checkbox__tick" size={13} strokeWidth={3} />
      </span>
      <span className="checkbox__label">{label}</span>
    </label>
  );
}
