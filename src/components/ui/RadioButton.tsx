import type { InputHTMLAttributes } from 'react';

export interface RadioButtonProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function RadioButton({
  label,
  className = '',
  id,
  ...props
}: RadioButtonProps) {
  const inputId =
    id ?? `radio-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <label
      className={['radio-field', className].filter(Boolean).join(' ')}
      htmlFor={inputId}
    >
      <input {...props} id={inputId} type="radio" className="radio-input" />
      <span className="radio-control" aria-hidden="true" />
      <span className="radio-label">{label}</span>
    </label>
  );
}
