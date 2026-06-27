// ============================================================================
// components/ui/Select.tsx - Form Select Component
// ============================================================================

import { SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  optional?: boolean | string;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, optional = false, options, className = '', style, id, required, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? `select-${generatedId}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const describedBy = [
      ariaDescribedBy,
      errorId,
      helperId,
    ].filter(Boolean).join(' ') || undefined;
    const optionalLabel = typeof optional === 'string' ? optional : 'Optional';

    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="mb-1 flex items-center gap-2 text-sm font-medium theme-text">
            <span>{label}</span>
            {required ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                Required
              </span>
            ) : optional ? (
              <span className="theme-subtle text-xs font-normal">{optionalLabel}</span>
            ) : null}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`
            theme-focus-ring theme-input theme-select w-full rounded-lg px-4 py-2
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
        {helperText && (
          <p id={helperId} className="mt-1 text-xs theme-subtle">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-sm text-[color:var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
