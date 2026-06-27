'use client';

import { useCallback, useMemo, useRef } from 'react';
import {
  fieldErrorsToFormSummary,
  getFirstFormFieldError,
  type FormFieldErrors,
} from '@/app/core/forms/formErrors';

interface UseFormValidationFeedbackArgs<TField extends string = string> {
  fieldErrors: FormFieldErrors<TField>;
  fieldOrder?: TField[];
  fieldLabels?: Partial<Record<TField, string>>;
  summaryId?: string;
}

function scrollAndFocus(element: HTMLElement | null | undefined) {
  if (!element) return;

  window.setTimeout(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }, 0);
}

export function useFormValidationFeedback<TField extends string = string>({
  fieldErrors,
  fieldOrder = [],
  fieldLabels = {},
  summaryId = 'form-validation-summary',
}: UseFormValidationFeedbackArgs<TField>) {
  const fieldRefs = useRef<Partial<Record<TField, HTMLElement | null>>>({});
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const summaryItems = useMemo(
    () => fieldErrorsToFormSummary(fieldErrors, fieldLabels as Record<string, string>),
    [fieldErrors, fieldLabels],
  );

  const setFieldRef = useCallback(
    (field: TField) => (element: HTMLElement | null) => {
      fieldRefs.current[field] = element;
    },
    [],
  );

  const getFieldErrorId = useCallback(
    (field: TField) => `${String(field)}-error`,
    [],
  );

  const getFieldHelperId = useCallback(
    (field: TField) => `${String(field)}-helper`,
    [],
  );

  const getFieldDescribedBy = useCallback(
    (field: TField, extraIds: Array<string | false | null | undefined> = []) => {
      const ids = [
        fieldErrors[field] ? getFieldErrorId(field) : null,
        ...extraIds,
      ].filter(Boolean);
      return ids.length ? ids.join(' ') : undefined;
    },
    [fieldErrors, getFieldErrorId],
  );

  const focusField = useCallback(
    (field: string) => {
      const target = fieldRefs.current[field as TField];
      scrollAndFocus(target ?? summaryRef.current);
    },
    [],
  );

  const focusFirstError = useCallback(
    (errorsOverride?: FormFieldErrors<TField>) => {
      const firstError = getFirstFormFieldError(
        errorsOverride ?? fieldErrors,
        fieldOrder as string[],
      );

      if (firstError) {
        const target = fieldRefs.current[firstError.field as TField];
        scrollAndFocus(target ?? summaryRef.current);
        return;
      }

      if ((errorsOverride ? fieldErrorsToFormSummary(errorsOverride) : summaryItems).length > 0) {
        scrollAndFocus(summaryRef.current);
      }
    },
    [fieldErrors, fieldOrder, summaryItems],
  );

  return {
    summaryId,
    summaryItems,
    summaryRef,
    setFieldRef,
    focusField,
    focusFirstError,
    getFieldErrorId,
    getFieldHelperId,
    getFieldDescribedBy,
  };
}
