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
    success: 'border border-green-200 bg-green-100 text-green-800',
    warning: 'border border-yellow-200 bg-yellow-100 text-yellow-800',
    danger: 'border border-red-200 bg-red-100 text-red-800',
    info: 'border border-blue-200 bg-blue-100 text-blue-800',
    default: 'border theme-border theme-surface-muted theme-text',
    blue: 'border border-blue-200 bg-blue-100 text-blue-800',
    green: 'border border-green-200 bg-green-100 text-green-800',
    yellow: 'border border-yellow-200 bg-yellow-100 text-yellow-800',
    red: 'border border-red-200 bg-red-100 text-red-800',
    maroon: 'theme-brand-badge',
    purple: 'border border-purple-200 bg-purple-100 text-purple-800',
    indigo: 'border border-blue-200 bg-indigo-100 text-indigo-800',
    orange: 'border border-yellow-200 bg-orange-100 text-orange-800',
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
