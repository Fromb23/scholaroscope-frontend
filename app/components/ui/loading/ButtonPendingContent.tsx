import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonPendingContentProps {
  pending: boolean;
  pendingLabel: ReactNode;
  children: ReactNode;
}

export function ButtonPendingContent({
  pending,
  pendingLabel,
  children,
}: ButtonPendingContentProps) {
  if (!pending) return <>{children}</>;

  return (
    <>
      <LoadingSpinner fullScreen={false} size="sm" />
      <span>{pendingLabel}</span>
    </>
  );
}
