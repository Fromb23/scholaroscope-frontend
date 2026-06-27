import type { FormFieldErrors } from '@/app/core/forms';
import type { CohortSubjectOption, SessionFormData } from '@/app/core/types/session';

export type SessionCreateField =
  | 'cohort'
  | 'cohort_subject'
  | 'session_date'
  | 'start_time'
  | 'end_time'
  | 'title'
  | 'venue'
  | string;

export interface SessionCreateValidationArgs {
  formData: SessionFormData;
  selectedCohort: number;
  selectedSubjectOption: CohortSubjectOption | null;
  extensionErrors?: FormFieldErrors<SessionCreateField>;
}

export interface SessionEditFormState {
  title: string;
  description: string;
  venue: string;
}

export type SessionEditField = 'title' | 'venue';

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

export function validateSessionCreateForm({
  formData,
  selectedCohort,
  selectedSubjectOption,
  extensionErrors = {},
}: SessionCreateValidationArgs): FormFieldErrors<SessionCreateField> {
  const errors: FormFieldErrors<SessionCreateField> = {};

  if (!selectedCohort) errors.cohort = 'Cohort is required.';
  if (!selectedSubjectOption || !selectedSubjectOption.session_supported || !formData.subject_source || !formData.subject_id) {
    errors.cohort_subject = 'Subject is required.';
  }
  if (!formData.session_date) errors.session_date = 'Date is required.';
  if (!formData.start_time) errors.start_time = 'Start time is required.';
  if (!formData.end_time) errors.end_time = 'End time is required.';
  if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
    errors.end_time = 'End time must be after start time.';
  }
  if (isBlank(formData.title)) errors.title = 'Session title is required.';
  if (isBlank(formData.venue)) errors.venue = 'Venue is required.';

  return {
    ...errors,
    ...extensionErrors,
  };
}

export function validateSessionEditForm(
  formData: SessionEditFormState,
): FormFieldErrors<SessionEditField> {
  const errors: FormFieldErrors<SessionEditField> = {};

  if (isBlank(formData.title)) errors.title = 'Session title is required.';
  if (isBlank(formData.venue)) errors.venue = 'Venue is required.';

  return errors;
}
