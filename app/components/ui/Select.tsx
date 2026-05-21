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
  ({ label, error, options, className = '', style, ...props }, ref) => {
    return (
      <div>
        {label && <label className="mb-1 block text-sm font-medium theme-text">{label}</label>}
        <select
          ref={ref}
          className={`
            theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-2
            ${error ? 'theme-input-error' : ''}
            ${className}
          `}
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            color: 'var(--color-text)',
            ...style,
          }}
          {...props}
        >
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={Boolean(option.disabled)}
              className={option.disabled ? 'theme-subtle' : 'theme-text'}
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                color: option.disabled ? 'var(--color-text-subtle)' : 'var(--color-text)',
              }}
            >
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
