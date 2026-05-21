// ============================================================================
// components/ui/Input.tsx - Form Input Component
// ============================================================================

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && <label className="mb-1 block text-sm font-medium theme-text">{label}</label>}
        <input
          ref={ref}
          className={`
            theme-input w-full rounded-lg px-4 py-2
            ${error ? 'theme-input-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-[color:var(--color-danger)]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
