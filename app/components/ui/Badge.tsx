interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'default'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'red'
    | 'maroon'
    | 'purple'
    | 'indigo'
    | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  title = '',
}: BadgeProps) {
  const variants = {
    success: 'theme-success-surface text-[color:var(--color-success)]',
    warning: 'theme-warning-surface text-[color:var(--color-warning)]',
    danger: 'theme-danger-surface text-[color:var(--color-danger)]',
    info: 'theme-info-surface text-[color:var(--color-info)]',
    default: 'theme-badge-default',
    blue: 'theme-info-surface text-[color:var(--color-info)]',
    green: 'theme-success-surface text-[color:var(--color-success)]',
    yellow: 'theme-warning-surface text-[color:var(--color-warning)]',
    red: 'theme-danger-surface text-[color:var(--color-danger)]',
    maroon: 'theme-brand-badge',
    purple: 'theme-brand-badge',
    indigo: 'theme-brand-badge',
    orange: 'theme-warning-surface text-[color:var(--color-warning)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
      title={title || undefined}
    >
      {children}
    </span>
  );
}
