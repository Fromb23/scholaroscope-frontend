import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const resetSource = readFileSync(
  join(process.cwd(), 'app/core/components/auth/ResetPasswordPage.tsx'),
  'utf8',
);
const forgotSource = readFileSync(
  join(process.cwd(), 'app/core/components/auth/ForgotPasswordPage.tsx'),
  'utf8',
);

describe('password reset page state contract', () => {
  it('renders all canonical lifecycle states with distinct copy', () => {
    expect(resetSource).toContain('password_reset_expired');
    expect(resetSource).toContain('password_reset_used');
    expect(resetSource).toContain('password_reset_superseded');
    expect(resetSource).toContain('password_reset_invalid');
    expect(resetSource).toContain('This password reset link has expired. Please request a new one.');
    expect(resetSource).toContain('This password reset link has already been used.');
    expect(resetSource).toContain('A newer password reset link was requested.');
    expect(resetSource).toContain('This password reset link is invalid.');
  });

  it('keeps infrastructure failures recoverable and separate from invalid tokens', () => {
    expect(resetSource).toContain("| 'unavailable'");
    expect(resetSource).toContain('We couldn’t validate this reset link right now.');
    expect(resetSource).toContain('Retry validation');
    expect(resetSource).toContain('void validateToken()');
    expect(resetSource).toContain('Back to login');
  });

  it('guards duplicate submissions and requires successful validation', () => {
    expect(resetSource).toContain("submittingRef.current || tokenState !== 'valid'");
    expect(forgotSource).toContain('if (submittingRef.current) return;');
    expect(resetSource).toContain('setForm({ new_password: \'\', confirm_password: \'\' })');
    expect(resetSource).toContain("router.push('/login')");
  });

  it('keeps mismatch editable and renders backend password policy at the field', () => {
    expect(resetSource).toContain("e.confirm_password = 'Passwords do not match'");
    expect(resetSource).toContain('passwordFieldErrorsFromError(err)');
    expect(resetSource).toContain("setErrors({ new_password: policyErrors.join(' ') })");
  });

  it('does not send token values to telemetry or page titles', () => {
    expect(resetSource).toContain("useSemanticPageTitle('Reset Password')");
    expect(resetSource).not.toMatch(/captureException|analytics|console\./);
  });
});
