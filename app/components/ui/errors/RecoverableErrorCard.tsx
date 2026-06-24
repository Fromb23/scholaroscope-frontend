'use client';

import type { ErrorUiModel } from './errorTypes';
import { Card } from '@/app/components/ui/Card';
import { ErrorState } from './ErrorState';

interface RecoverableErrorCardProps {
  error: ErrorUiModel;
  onRetry?: () => void;
  className?: string;
}

export function RecoverableErrorCard({ error, onRetry, className = '' }: RecoverableErrorCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <ErrorState error={error} onRetry={onRetry} fullScreen={false} />
    </Card>
  );
}
