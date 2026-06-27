import type { AppError } from '@/app/core/errors';
import { formatFieldLabel } from '@/app/core/errors/fieldErrors';

export type FormFieldErrors<TField extends string = string> = Partial<Record<TField, string | string[]>>;

export interface FormSummaryItem {
  field: string;
  label: string;
  message: string;
}

export function normalizeFormFieldMessages(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((message) => message.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const message = value.trim();
    return message ? [message] : [];
  }
  return [];
}

export function getFormFieldErrorMessage(value: string | string[] | null | undefined): string | undefined {
  return normalizeFormFieldMessages(value)[0];
}

export function normalizeFormFieldErrors<TField extends string = string>(
  errors: FormFieldErrors<TField>,
): Record<TField, string[]> {
  return Object.entries(errors).reduce<Record<TField, string[]>>((normalized, [field, value]) => {
    const messages = normalizeFormFieldMessages(value as string | string[] | undefined);
    if (messages.length > 0) {
      normalized[field as TField] = messages;
    }
    return normalized;
  }, {} as Record<TField, string[]>);
}

export function formFieldErrorsToStringMap<TField extends string = string>(
  errors: FormFieldErrors<TField>,
): Record<string, string> {
  return Object.entries(errors).reduce<Record<string, string>>((mapped, [field, value]) => {
    const message = getFormFieldErrorMessage(value as string | string[] | undefined);
    if (message) {
      mapped[field] = message;
    }
    return mapped;
  }, {});
}

export function hasFormFieldErrors(errors: FormFieldErrors): boolean {
  return Object.values(errors).some((value) => normalizeFormFieldMessages(value).length > 0);
}

export function getFirstFormFieldError(
  errors: FormFieldErrors,
  fieldOrder?: string[],
): { field: string; message: string } | null {
  const normalized = normalizeFormFieldErrors(errors);
  const orderedFields = fieldOrder?.length
    ? [
        ...fieldOrder,
        ...Object.keys(normalized).filter((field) => !fieldOrder.includes(field)),
      ]
    : Object.keys(normalized);

  for (const field of orderedFields) {
    const message = normalized[field]?.[0];
    if (message) {
      return { field, message };
    }
  }

  return null;
}

export function fieldErrorsToFormSummary(
  errors: FormFieldErrors,
  fieldLabels: Record<string, string> = {},
): FormSummaryItem[] {
  return Object.entries(normalizeFormFieldErrors(errors)).flatMap(([field, messages]) => (
    messages.map((message) => ({
      field,
      label: fieldLabels[field] ?? formatFieldLabel(field),
      message,
    }))
  ));
}

export function createFormValidationAppError(args: {
  fieldErrors: Record<string, string[]>;
  title?: string;
  message?: string;
}): AppError {
  return {
    kind: 'validation',
    title: args.title ?? 'Some fields need correction.',
    message: args.message ?? 'Review the highlighted fields before submitting.',
    fieldErrors: args.fieldErrors,
    retryable: false,
    severity: 'warning',
  };
}
