import type { SelectHTMLAttributes } from 'react';

function SelectChevron() {
  return (
    <span className="select-chevron" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
  autoWidth?: boolean;
}

export function Select({
  fullWidth = false,
  autoWidth = false,
  className = '',
  children,
  ...props
}: SelectProps) {
  const controlClass = [
    'select-control',
    fullWidth ? 'select-control--full' : '',
    autoWidth ? 'select-control--auto' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={controlClass}>
      <select className="select-field mono" {...props}>
        {children}
      </select>
      <SelectChevron />
    </div>
  );
}
