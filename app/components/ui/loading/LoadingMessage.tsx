import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingMessageProps {
  title: ReactNode;
  description?: ReactNode;
  showSpinner?: boolean;
  className?: string;
}

export function LoadingMessage({
  title,
  description,
  showSpinner = true,
  className = '',
}: LoadingMessageProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`} role="status" aria-live="polite">
      {showSpinner ? (
        <div className="pt-0.5">
          <LoadingSpinner fullScreen={false} size="sm" />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium theme-text">{title}</p>
        {description ? <p className="mt-1 text-sm theme-muted">{description}</p> : null}
      </div>
    </div>
  );
}
