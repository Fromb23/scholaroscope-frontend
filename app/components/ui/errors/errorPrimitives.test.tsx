import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ErrorUiModel } from './errorTypes';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner, ValidationErrorSummary } from '@/app/components/ui/errors';

const validationError: ErrorUiModel = {
  kind: 'validation',
  title: 'Instructor account was not created.',
  message: 'Check the email address and required fields, then try again.',
  fieldErrors: {
    email: ['A user with this email already exists.'],
    first_name: ['This field is required.'],
  },
  retryable: false,
  severity: 'warning',
};

describe('error UI primitives', () => {
  it('AppErrorBanner renders title, message, and field errors', () => {
    const html = renderToStaticMarkup(<AppErrorBanner error={validationError} />);

    expect(html).toContain('Instructor account was not created.');
    expect(html).toContain('Check the email address and required fields');
    expect(html).toContain('Email address:');
    expect(html).toContain('A user with this email already exists.');
  });

  it('ValidationErrorSummary renders friendly labels', () => {
    const html = renderToStaticMarkup(<ValidationErrorSummary fieldErrors={validationError.fieldErrors ?? {}} />);

    expect(html).toContain('Email address:');
    expect(html).toContain('First name:');
  });

  it('Input marks required fields and wires error text with aria attributes', () => {
    const html = renderToStaticMarkup(
      <Input
        id="session-title"
        label="Session title"
        required
        error="Session title is required."
        value=""
        onChange={() => undefined}
      />,
    );

    expect(html).toContain('for="session-title"');
    expect(html).toContain('Required');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="session-title-error"');
    expect(html).toContain('id="session-title-error"');
  });

  it('Select marks optional fields and wires helper text with aria attributes', () => {
    const html = renderToStaticMarkup(
      <Select
        id="learner-gender"
        label="Gender"
        optional
        helperText="Optional demographic detail."
        value=""
        onChange={() => undefined}
        options={[{ value: '', label: 'Select gender...' }]}
      />,
    );

    expect(html).toContain('for="learner-gender"');
    expect(html).toContain('Optional');
    expect(html).toContain('aria-describedby="learner-gender-helper"');
    expect(html).toContain('Optional demographic detail.');
  });
});
