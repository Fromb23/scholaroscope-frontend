import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

    expect(source).toContain("code === 'email_not_verified'");
    expect(source).toContain('Verify your email before logging in.');
    expect(source).toContain('Resend verification email');
    expect(source).toContain('authAPI.resendVerification(verificationEmail)');
  });
});
