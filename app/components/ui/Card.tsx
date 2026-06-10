// ============================================================================
// components/ui/Card.tsx - Reusable Card Component
// ============================================================================

import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return <div className={`theme-card rounded-lg p-6 ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return <div className={`mb-4 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }: CardProps) {
  return <h3 className={`text-lg font-semibold theme-text ${className}`} {...props}>{children}</h3>;
}

export function CardContent({ children, className = '', ...props }: CardProps) {
  return <div className={className} {...props}>{children}</div>;
}
