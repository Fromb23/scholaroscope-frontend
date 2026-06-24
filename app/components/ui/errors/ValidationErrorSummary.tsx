'use client';

import { AlertTriangle } from 'lucide-react';
import { fieldErrorsToSummary, formatFieldLabel } from './fieldErrorPresentation';

interface ValidationErrorSummaryProps {
  fieldErrors: Record<string, string[]>;
  title?: string;
  className?: string;
}

export function ValidationErrorSummary({
  fieldErrors,
  title = 'Review these fields before continuing',
  className = '',
}: ValidationErrorSummaryProps) {
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return null;

  return (
    <div className={`theme-warning-surface rounded-lg p-3 text-sm ${className}`} role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold theme-text">{title}</p>
          <ul className="mt-2 space-y-1">
            {entries.map(([field, messages]) => (
              <li key={field} className="theme-text">
                <span className="font-medium">{formatFieldLabel(field)}:</span> {messages.join(' ')}
              </li>
            ))}
          </ul>
          <span className="sr-only">{fieldErrorsToSummary(fieldErrors)}</span>
        </div>
      </div>
    </div>
  );
}
