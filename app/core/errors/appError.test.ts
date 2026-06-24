import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractFieldErrors, fieldErrorsToSummary } from './fieldErrors';
import { resolveAppError } from './resolveAppError';
import { sanitizeServerMessage } from './sanitizeServerMessage';

describe('resolveAppError', () => {
  it('classifies validation errors and preserves field errors', () => {
    const error = resolveAppError(
      {
        response: {
          status: 400,
          data: {
            email: ['A user with this email already exists.'],
            first_name: ['This field is required.'],
          },
        },
      },
      { domain: 'instructors', action: 'create', entityLabel: 'instructor account', role: 'ADMIN' },
    );

    expect(error.kind).toBe('validation');
    expect(error.title).toBe('Instructor account was not created.');
    expect(error.retryable).toBe(false);
    expect(error.fieldErrors?.email).toEqual(['A user with this email already exists.']);
  });

  it('classifies permission errors with role-aware recovery copy', () => {
    const error = resolveAppError(
      { response: { status: 403, data: { detail: 'You do not have permission to perform this action.' } } },
      { domain: 'reports', action: 'load', entityLabel: 'class report', role: 'INSTRUCTOR' },
    );

    expect(error.kind).toBe('permission');
    expect(error.title).toContain('access');
    expect(error.message).toContain('permission');
    expect(error.retryable).toBe(false);
  });

  it('classifies network and server failures as retryable', () => {
    const network = resolveAppError(new TypeError('Failed to fetch'), {
      domain: 'reports',
      action: 'load',
      entityLabel: 'report workspace',
    });
    const server = resolveAppError(
      { response: { status: 500, data: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' } } } },
      { domain: 'reports', action: 'compute', entityLabel: 'learner report' },
    );

    expect(network.kind).toBe('network');
    expect(network.retryable).toBe(true);
    expect(server.kind).toBe('server');
    expect(server.retryable).toBe(true);
  });

  it('uses structured report readiness codes', () => {
    const error = resolveAppError(
      { response: { status: 409, data: { error: { code: 'report_not_ready', message: 'Report is still computing.' } } } },
      { domain: 'reports', action: 'load', entityLabel: 'learner report' },
    );

    expect(error.kind).toBe('report_not_ready');
    expect(error.title).toBe('This report is not ready yet.');
  });
});

describe('sanitizeServerMessage', () => {
  it('blocks internal exception and database strings', () => {
    expect(sanitizeServerMessage('IntegrityError: duplicate key value violates unique constraint', 'server'))
      .toBe('The server could not complete this request. Try again later.');
    expect(sanitizeServerMessage('matching query does not exist at /api/users/', 'validation'))
      .toBe('Some details need correction before this can be saved.');
  });

  it('keeps normal user-safe backend messages', () => {
    expect(sanitizeServerMessage('This assessment is already finalized.', 'lifecycle_locked'))
      .toBe('This assessment is already finalized.');
  });
});

describe('field errors', () => {
  it('extracts and summarizes friendly field labels', () => {
    const fieldErrors = extractFieldErrors({
      email: ['A user with this email already exists.'],
      first_name: ['This field is required.'],
      detail: 'Invalid request',
    });

    expect(fieldErrors).toEqual({
      email: ['A user with this email already exists.'],
      first_name: ['This field is required.'],
    });
    expect(fieldErrorsToSummary(fieldErrors)).toContain('Email address: A user with this email already exists.');
    expect(fieldErrorsToSummary(fieldErrors)).toContain('First name: This field is required.');
  });
});

describe('check-error-copy guardrail', () => {
  it('catches raw generic error copy in a fixture', () => {
    const fixtureDir = join(process.cwd(), '.tmp-error-copy-check');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, 'Bad.tsx'), 'export function Bad() { return <p>{"Something went wrong."}</p>; }');

    try {
      expect(() => execFileSync('node', ['tools/check-error-copy.mjs', fixtureDir])).toThrow();
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});
