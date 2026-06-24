import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ErrorUiModel } from './errorTypes';
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
});
