import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CohortSubjectOption, SessionFormData } from '@/app/core/types/session';
import {
  validateSessionCreateForm,
  validateSessionEditForm,
} from './sessionFormValidation';

const validSubjectOption: CohortSubjectOption = {
  source: 'kernel',
  id: 'kernel-12',
  label: 'Mathematics',
  subject_id: 12,
  subject_code: 'MATH',
  programme: null,
  curriculum_version: null,
  plugin: null,
  cohort_subject_id: 44,
  session_supported: true,
};

function validCreateForm(overrides: Partial<SessionFormData> = {}): SessionFormData {
  return {
    cohort_subject: 44,
    subject_source: 'kernel',
    subject_id: 12,
    term: 3,
    session_type: 'LESSON',
    session_date: '2026-06-14',
    start_time: '08:00',
    end_time: '09:00',
    title: 'Fractions review',
    description: '',
    venue: 'Room 1',
    auto_create_attendance: true,
    ...overrides,
  };
}

describe('session form validation', () => {
  it('create session requires session title and venue', () => {
    const errors = validateSessionCreateForm({
      formData: validCreateForm({ title: ' ', venue: '' }),
      selectedCohort: 8,
      selectedSubjectOption: validSubjectOption,
    });

    expect(errors.title).toBe('Session title is required.');
    expect(errors.venue).toBe('Venue is required.');
  });

  it('create session requires cohort, subject, date, and valid times', () => {
    const errors = validateSessionCreateForm({
      formData: validCreateForm({
        subject_source: undefined,
        subject_id: null,
        session_date: '',
        start_time: '11:00',
        end_time: '10:00',
      }),
      selectedCohort: 0,
      selectedSubjectOption: null,
    });

    expect(errors.cohort).toBe('Cohort is required.');
    expect(errors.cohort_subject).toBe('Subject is required.');
    expect(errors.session_date).toBe('Date is required.');
    expect(errors.end_time).toBe('End time must be after start time.');
  });

  it('valid create session has no local field errors', () => {
    const errors = validateSessionCreateForm({
      formData: validCreateForm(),
      selectedCohort: 8,
      selectedSubjectOption: validSubjectOption,
    });

    expect(errors).toEqual({});
  });

  it('edit session requires session title and venue', () => {
    expect(validateSessionEditForm({
      title: '',
      description: 'Notes',
      venue: 'Room 1',
    })).toEqual({ title: 'Session title is required.' });

    expect(validateSessionEditForm({
      title: 'Fractions review',
      description: 'Notes',
      venue: ' ',
    })).toEqual({ venue: 'Venue is required.' });
  });

  it('valid edit session has no local field errors', () => {
    expect(validateSessionEditForm({
      title: 'Fractions review',
      description: 'Notes',
      venue: 'Room 1',
    })).toEqual({});
  });

  it('create and edit forms render validation summaries and avoid the legacy silent validate return', () => {
    const createSource = readFileSync(
      join(process.cwd(), 'app/core/components/sessions/SessionForm.tsx'),
      'utf8',
    );
    const editSource = readFileSync(
      join(process.cwd(), 'app/core/components/sessions/EditSessionForm.tsx'),
      'utf8',
    );

    expect(createSource).toContain('<FormValidationSummary');
    expect(createSource).toContain('focusFirstError(validationErrors)');
    expect(createSource).toContain('createSession({ ...formData');
    expect(createSource).not.toContain('if (!validate()) return');

    expect(editSource).toContain('<FormValidationSummary');
    expect(editSource).toContain('focusFirstError(validationErrors)');
    expect(editSource).toContain('updateSession(session.id');
    expect(editSource).not.toContain('if (!validate()) return');
  });
});
