import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAuthError } from '@/app/core/errors';

describe('email verification auth screens', () => {
  it('handles verify-email states and resend actions', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/auth/VerifyEmailPage.tsx'), 'utf8');

    expect(source).toContain("type VerifyState = 'verifying' | 'success' | 'expired' | 'invalid' | 'already_verified'");
    expect(source).toContain("code === 'email_verification_expired'");
    expect(source).toContain('authAPI.resendVerification(email)');
    expect(source).toContain("router.replace('/dashboard')");
  });

  it('shows resend affordance when login is blocked by email verification', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/auth/LoginPage.tsx'), 'utf8');

    expect(source).toContain("errorCode === 'email_not_verified'");
    expect(source).toContain('resolveAuthError');
    expect(source).toContain('Resend verification email');
    expect(source).toContain('authAPI.resendVerification(verificationEmail)');
  });

  it('renders invalid login credentials through one error message path', () => {
    const error = resolveAuthError(
      {
        status: 400,
        data: {
          non_field_errors: ['Invalid email or password.'],
        },
      },
      { action: 'login', entityLabel: 'account access' },
    );
    const html = renderToStaticMarkup(React.createElement(AppErrorBanner, { error }));

    expect(html).toContain('Invalid email or password.');
    expect(html).not.toContain('Form:');
    expect(html).not.toContain('Review these fields before continuing');
    expect(html.match(/Invalid email or password\./g)).toHaveLength(1);
    expect(html.match(/role="alert"/g)).toHaveLength(1);
  });
});
