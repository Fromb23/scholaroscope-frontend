// ============================================================================
// components/ui/Button.tsx - Reusable Button Component
// ============================================================================

import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  ...props
}, ref) {
  const baseStyles =
    'theme-focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'theme-button-primary',
    secondary: 'theme-button-secondary',
    danger: 'theme-button-danger',
    ghost: 'theme-button-ghost',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        borderRadius: 'var(--brand-button-radius, 8px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
});
