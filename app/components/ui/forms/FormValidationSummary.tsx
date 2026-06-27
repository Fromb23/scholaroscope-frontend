'use client';

import { AlertTriangle } from 'lucide-react';
import { formatFieldLabel } from '@/app/components/ui/errors/fieldErrorPresentation';

type FormFieldErrors<TField extends string = string> = Partial<Record<TField, string | string[]>>;

function normalizeMessages(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((message) => message.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const message = value.trim();
    return message ? [message] : [];
  }
  return [];
}

function summaryItems<TField extends string>(
  fieldErrors: FormFieldErrors<TField>,
  fieldLabels: Partial<Record<TField, string>>,
) {
  return Object.entries(fieldErrors).flatMap(([field, value]) => (
    normalizeMessages(value as string | string[] | undefined).map((message) => ({
      field,
      label: fieldLabels[field as TField] ?? formatFieldLabel(field),
      message,
    }))
  ));
}

interface FormValidationSummaryProps<TField extends string = string> {
  fieldErrors: FormFieldErrors<TField>;
  fieldLabels?: Partial<Record<TField, string>>;
  title?: string;
  description?: string;
  onFieldClick?: (field: TField) => void;
  id?: string;
  className?: string;
}

function countTitle(count: number) {
  return `${count} field${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} correction.`;
}

export function FormValidationSummary<TField extends string = string>({
  fieldErrors,
  fieldLabels = {},
  title,
  description = 'Review the highlighted fields before submitting.',
  onFieldClick,
  id = 'form-validation-summary',
  className = '',
}: FormValidationSummaryProps<TField>) {
  const items = summaryItems(fieldErrors, fieldLabels);
  if (items.length === 0) return null;

  const heading = title ?? countTitle(items.length);

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className={`theme-warning-surface rounded-lg p-4 text-sm outline-none ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold theme-text">{heading}</p>
          {description ? <p className="mt-1 theme-muted">{description}</p> : null}
          <ul className="mt-3 space-y-1.5">
            {items.map((item) => (
              <li key={`${item.field}-${item.message}`}>
                {onFieldClick ? (
                  <button
                    type="button"
                    className="theme-link text-left text-sm font-medium"
                    onClick={() => onFieldClick(item.field as TField)}
                  >
                    {item.label}: <span className="font-normal theme-text">{item.message}</span>
                  </button>
                ) : (
                  <span className="theme-text">
                    <span className="font-medium">{item.label}:</span> {item.message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
