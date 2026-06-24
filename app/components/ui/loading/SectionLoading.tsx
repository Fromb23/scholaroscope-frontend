import type { ReactNode } from 'react';
import { LoadingMessage } from './LoadingMessage';

interface SectionLoadingProps {
  title?: ReactNode;
  message?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function SectionLoading({
  title,
  message,
  description,
  className = '',
}: SectionLoadingProps) {
  return (
    <div className={`theme-card rounded-lg p-6 ${className}`}>
      <LoadingMessage title={title ?? message ?? 'Preparing this section...'} description={description} />
    </div>
  );
}
