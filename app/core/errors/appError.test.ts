import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveLearnerError,
  resolveReportError,
  resolveTeachingError,
  resolveWorkspaceError,
} from './domainResolvers';
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
    expect(error.channel).toBe('inline');
    expect(error.fieldErrors?.email).toEqual(['A user with this email already exists.']);
  });

  it('uses non_field_errors as the message without attaching field errors', () => {
    const error = resolveAppError(
      {
        response: {
          status: 400,
          data: {
            non_field_errors: ['Invalid email or password.'],
          },
        },
      },
      { domain: 'auth', action: 'login', entityLabel: 'account access' },
    );

    expect(error.kind).toBe('validation');
    expect(error.message).toBe('Invalid email or password.');
    expect(error.fieldErrors).toBeUndefined();
    expect(error.channel).toBe('banner');
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
    expect(error.channel).toBe('page');
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
    expect(network.channel).toBe('page');
    expect(server.kind).toBe('server');
    expect(server.retryable).toBe(true);
    expect(server.channel).toBe('banner');
  });

  it('routes background auth failures to toast channel', () => {
    const error = resolveAppError(new TypeError('Failed to fetch'), {
      domain: 'auth',
      action: 'logout',
      entityLabel: 'logout session revoke',
      background: true,
    });

    expect(error.kind).toBe('network');
    expect(error.channel).toBe('toast');
  });

  it('uses structured report readiness codes', () => {
    const error = resolveAppError(
      { response: { status: 409, data: { error: { code: 'report_not_ready', message: 'Report is still computing.' } } } },
      { domain: 'reports', action: 'load', entityLabel: 'learner report' },
    );

    expect(error.kind).toBe('report_not_ready');
    expect(error.title).toBe('This report is not ready yet.');
  });

  it('classifies personal workspace single-teacher codes as workspace boundaries', () => {
    const error = resolveAppError(
      { response: { status: 400, data: { error: { code: 'personal_workspace_single_teacher' } } } },
      { domain: 'workspace', action: 'create', entityLabel: 'workspace member' },
    );

    expect(error.kind).toBe('workspace_boundary');
    expect(error.title).toBe('This workspace is for one teacher.');
    expect(error.retryable).toBe(false);
    expect(error.severity).toBe('warning');
  });

  it('classifies generic workspace boundary codes as non-retryable warnings', () => {
    const error = resolveAppError(
      { response: { status: 400, data: { error: { code: 'workspace_boundary' } } } },
      { domain: 'workspace', action: 'create', entityLabel: 'workspace member' },
    );

    expect(error.kind).toBe('workspace_boundary');
    expect(error.retryable).toBe(false);
    expect(error.severity).toBe('warning');
  });

  it('does not let unsafe server messages override workspace boundary copy', () => {
    const error = resolveAppError(
      {
        response: {
          status: 400,
          data: {
            error: {
              code: 'workspace_boundary',
              message: 'IntegrityError: duplicate key value violates unique constraint',
            },
          },
        },
      },
      { domain: 'workspace', action: 'create', entityLabel: 'workspace member' },
    );

    expect(error.kind).toBe('workspace_boundary');
    expect(error.message).toBe('This workspace type does not allow that action.');
  });

  it('uses teacher recovery language for freelance owner-admin workspace behavior', () => {
    const error = resolveAppError(
      { response: { status: 403, data: { detail: 'You do not have permission to perform this action.' } } },
      { domain: 'reports', action: 'load', entityLabel: 'class report', role: 'ADMIN', workspaceBehavior: 'FREELANCE_TEACHER' },
    );

    expect(error.message).toContain('this teacher should be allowed');
  });

  it('uses teacher recovery language when capabilities show teaching without staff management', () => {
    const error = resolveAppError(
      { response: { status: 403, data: { detail: 'You do not have permission to perform this action.' } } },
      {
        domain: 'reports',
        action: 'load',
        entityLabel: 'class report',
        role: 'ADMIN',
        capabilities: { can_teach: true, can_manage_staff: false },
      },
    );

    expect(error.message).toContain('this teacher should be allowed');
  });

  it('keeps institution admin, instructor, and superadmin recovery language distinct', () => {
    const makeError = (role: 'ADMIN' | 'INSTRUCTOR' | 'SUPERADMIN') => resolveAppError(
      { response: { status: 403, data: { detail: 'You do not have permission to perform this action.' } } },
      { domain: role === 'SUPERADMIN' ? 'superadmin' : 'reports', action: 'load', entityLabel: 'class report', role },
    );

    expect(makeError('ADMIN').message).toContain('this admin should be allowed');
    expect(makeError('INSTRUCTOR').message).toContain('this teacher should be allowed');
    expect(makeError('SUPERADMIN').message).toContain('this superadmin should be allowed');
  });

  it('uses stable registry copy before server copy', () => {
    const error = resolveAppError(
      {
        response: {
          status: 400,
          data: {
            error: {
              code: 'class_report_policy_required',
              message: 'IntegrityError: report_policy_id violates SQL constraint',
            },
          },
        },
      },
      { domain: 'reports', action: 'compute', entityLabel: 'class report' },
    );

    expect(error.kind).toBe('setup_required');
    expect(error.title).toBe('Set report rules before calculating.');
    expect(error.message).toBe('Create report rules for this class or subject before calculating results.');
    expect(error.actionLabel).toBe('Set report rules');
    expect(error.severity).toBe('warning');
    expect(error.retryable).toBe(false);
  });

  it('falls back safely for unknown codes', () => {
    const error = resolveAppError(
      { response: { status: 404, data: { error: { code: 'unexpected_school_record_missing' } } } },
      { domain: 'learners', action: 'load', entityLabel: 'learner profile' },
    );

    expect(error.kind).toBe('not_found');
    expect(error.title).toBe('Learner profile could not be found.');
  });

  it('preserves field errors with registry-backed codes', () => {
    const error = resolveAppError(
      {
        response: {
          status: 400,
          data: {
            error: {
              code: 'class_report_policy_required',
              field_errors: { term: ['Choose a term before calculating.'] },
            },
          },
        },
      },
      { domain: 'reports', action: 'compute', entityLabel: 'class report' },
    );

    expect(error.fieldErrors?.term).toEqual(['Choose a term before calculating.']);
    expect(error.message).toBe('Create report rules for this class or subject before calculating results.');
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

  it('extracts structured envelope field_errors', () => {
    expect(extractFieldErrors({
      error: {
        type: 'validation_error',
        code: 'invalid_registration',
        message: 'Some fields need correction.',
        field_errors: {
          email: ['This email is already registered.'],
          non_field_errors: ['The selected class is closed.'],
        },
      },
    })).toEqual({
      email: ['This email is already registered.'],
    });
  });

  it('extracts structured envelope fieldErrors', () => {
    expect(extractFieldErrors({
      error: {
        fieldErrors: {
          workspace_name: ['This name is already taken.'],
          non_field_errors: ['Choose a different workspace.'],
        },
      },
    })).toEqual({
      workspace_name: ['This name is already taken.'],
    });
  });

  it('does not treat nested metadata keys as fields', () => {
    expect(extractFieldErrors({
      error: {
        type: 'validation_error',
        code: 'invalid_registration',
        message: 'Some fields need correction.',
        detail: 'Invalid payload.',
        status: 400,
        support_code: 'REQ-123',
        context: { route: 'registration' },
      },
    })).toEqual({});
  });

  it('excludes non_field_errors from field errors', () => {
    expect(extractFieldErrors({
      non_field_errors: ['The selected class is closed.'],
      detail: 'Invalid request',
    })).toEqual({});
  });

  it('excludes non_field_errors while preserving real field errors', () => {
    expect(extractFieldErrors({
      non_field_errors: ['The selected class is closed.'],
      email: ['Enter a valid email address.'],
      password2: ['Passwords do not match.'],
    })).toEqual({
      email: ['Enter a valid email address.'],
      password2: ['Passwords do not match.'],
    });
  });
});

describe('domain error resolvers', () => {
  it('resolveTeachingError uses lesson record copy', () => {
    const error = resolveTeachingError(
      { response: { status: 500, data: {} } },
      { action: 'save', entityLabel: 'lesson record', role: 'INSTRUCTOR' },
    );

    expect(error.title).toBe('We could not save this lesson record.');
    expect(error.message).toContain('Your lesson record is still open');
  });

  it('resolveLearnerError uses learner domain copy', () => {
    const error = resolveLearnerError(
      { response: { status: 404, data: { detail: 'Not found.' } } },
      { action: 'load', entityLabel: 'learner profile', role: 'INSTRUCTOR' },
    );

    expect(error.title).toBe('Learner profile could not be found.');
  });

  it('resolveReportError uses report registry copy', () => {
    const error = resolveReportError(
      { response: { status: 400, data: { error: { code: 'class_report_policy_required' } } } },
      { action: 'compute', entityLabel: 'class report', role: 'INSTRUCTOR' },
    );

    expect(error.title).toBe('Set report rules before calculating.');
    expect(error.actionLabel).toBe('Set report rules');
  });

  it('resolveWorkspaceError passes workspace behavior through', () => {
    const error = resolveWorkspaceError(
      { response: { status: 400, data: { error: { code: 'workspace_boundary' } } } },
      { action: 'create', entityLabel: 'workspace member', role: 'ADMIN', workspaceBehavior: 'FREELANCE_TEACHER' },
    );

    expect(error.message).toContain('Freelance Teacher Workspaces are designed for one teacher');
  });

  it('domain resolvers pass capabilities through', () => {
    const error = resolveWorkspaceError(
      { response: { status: 400, data: { error: { code: 'workspace_boundary' } } } },
      {
        action: 'create',
        entityLabel: 'workspace member',
        role: 'ADMIN',
        capabilities: { can_teach: true, can_manage_staff: false },
      },
    );

    expect(error.message).toContain('Freelance Teacher Workspaces are designed for one teacher');
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

  it('catches direct resolveAppError usage in feature fixtures', () => {
    const fixtureDir = join(process.cwd(), '.tmp-error-copy-check');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      join(fixtureDir, 'Bad.tsx'),
      [
        "import { resolveAppError } from '@/app/core/errors';",
        "export function Bad() { return resolveAppError(new Error('x'), { domain: 'reports', action: 'load' }); }",
      ].join('\n'),
    );

    try {
      expect(() => execFileSync('node', ['tools/check-error-copy.mjs', fixtureDir])).toThrow(
        /Use a domain resolver such as resolveTeachingError/,
      );
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('requires burn-down baseline metadata in the checker', () => {
    const checker = readFileSync(join(process.cwd(), 'tools/check-error-copy.mjs'), 'utf8');

    expect(checker).toContain('"owner": "frontend-migration"');
    expect(checker).toContain('"priority": "P');
    expect(checker).toContain('"removeBy": "2026-');
    expect(checker).toContain('must include an owner');
    expect(checker).toContain('expired on');
  });
});
