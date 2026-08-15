// ============================================================================
// components/ui/Input.tsx - Form Input Component
// ============================================================================

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { FieldLabel } from './FieldLabel';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  optional?: boolean | string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, optional = false, className = '', id, required, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [
      ariaDescribedBy,
      errorId,
      helperId,
    ].filter(Boolean).join(' ') || undefined;
    const optionalLabel = typeof optional === 'string' ? optional : 'Optional';

    return (
      <div>
        {label && (
          <FieldLabel htmlFor={inputId} required={required} optional={optional ? optionalLabel : false}>
            {label}
          </FieldLabel>
        )}
        <input
          id={inputId}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`
            theme-input w-full rounded-lg px-4 py-2
            ${error ? 'theme-input-error' : ''}
            ${className}
          `}
          {...props}
        />
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

Input.displayName = 'Input';
