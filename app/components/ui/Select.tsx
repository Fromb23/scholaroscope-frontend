// ============================================================================
// components/ui/Select.tsx - Form Select Component
// ============================================================================

import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div>
        {label && <label className="mb-1 block text-sm font-medium theme-text">{label}</label>}
        <select
          ref={ref}
          className={`
            theme-input w-full rounded-lg px-4 py-2
            ${error ? 'theme-input-error' : ''}
            ${className}
          `}
          {...props}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={Boolean(option.disabled)}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-[color:var(--color-danger)]">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
