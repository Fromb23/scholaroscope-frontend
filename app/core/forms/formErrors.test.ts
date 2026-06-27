import { describe, expect, it } from 'vitest';
import {
  createFormValidationAppError,
  fieldErrorsToFormSummary,
  formFieldErrorsToStringMap,
  getFirstFormFieldError,
  hasFormFieldErrors,
  normalizeFormFieldErrors,
} from './formErrors';

describe('form error contract utilities', () => {
  it('detects and normalizes field errors', () => {
    const errors = {
      title: 'Session title is required.',
      venue: ['Venue is required.', 'Choose a real room.'],
      description: '',
    };

    expect(hasFormFieldErrors(errors)).toBe(true);
    expect(normalizeFormFieldErrors(errors)).toEqual({
      title: ['Session title is required.'],
      venue: ['Venue is required.', 'Choose a real room.'],
    });
    expect(formFieldErrorsToStringMap(errors)).toEqual({
      title: 'Session title is required.',
      venue: 'Venue is required.',
    });
  });

  it('finds the first error using field order', () => {
    const first = getFirstFormFieldError(
      {
        venue: 'Venue is required.',
        title: 'Session title is required.',
      },
      ['title', 'venue'],
    );

    expect(first).toEqual({
      field: 'title',
      message: 'Session title is required.',
    });
  });

  it('creates human-readable summary rows', () => {
    expect(fieldErrorsToFormSummary(
      { workspace_name: 'Workspace name is required' },
      { workspace_name: 'Workspace name' },
    )).toEqual([
      {
        field: 'workspace_name',
        label: 'Workspace name',
        message: 'Workspace name is required',
      },
    ]);
  });

  it('creates validation AppErrors without marking local form validation retryable', () => {
    const appError = createFormValidationAppError({
      fieldErrors: {
        title: ['Session title is required.'],
      },
    });

    expect(appError.kind).toBe('validation');
    expect(appError.retryable).toBe(false);
    expect(appError.severity).toBe('warning');
    expect(appError.fieldErrors?.title).toEqual(['Session title is required.']);
  });
});
