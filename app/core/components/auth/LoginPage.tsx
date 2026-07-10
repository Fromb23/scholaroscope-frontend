'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { authAPI } from '@/app/core/api/auth';
import { Button } from '@/app/components/ui/Button';
import { resolveAuthError, type AppError } from '@/app/core/errors';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { getPlatformAppUrl } from '@/app/core/auth/platformRedirect';
import type { AccessNotice } from '@/app/core/types/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [platformLoginRequired, setPlatformLoginRequired] = useState(false);
  const searchParams = useSearchParams();
  const { login, acceptInvite } = useAuth();
  const router = useRouter();

  const inviteToken = searchParams.get('invite');
  const orgName = searchParams.get('org');
  const next = searchParams.get('next');

  useEffect(() => {
    if (searchParams.get('reason') === 'suspended') {
      setError({
        kind: 'permission',
        title: 'Workspace access is suspended.',
        message: 'Your organization has been suspended. Contact your administrator for more information.',
        retryable: false,
        severity: 'warning',
      });
    } else if (searchParams.get('reason') === 'no_access') {
      setError({
        kind: 'permission',
        title: 'No active workspace is available.',
        message: 'You do not currently have access to any active workspace. Ask an admin to activate or invite you to a workspace.',
        retryable: false,
        severity: 'warning',
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const inviteEmail = searchParams.get('email');
    if (inviteEmail) setEmail(inviteEmail);
  }, [searchParams]);

  const resolveErrorMessage = (data: Record<string, unknown>): string => {
    const state = data?.state as string;
    const errorCode = data?.error as string;
    const code = data?.code as string;
    const restrictedOrgs = (data?.restricted_orgs as AccessNotice[]) ?? [];
    const orgSuspendedOrgs = (data?.org_suspended_orgs as AccessNotice[]) ?? [];
    const removedOrgs = (data?.removed_orgs as AccessNotice[]) ?? [];
    const pendingOrgs = (data?.pending_orgs as AccessNotice[]) ?? [];
    const platformRestrictionMessage = (data?.non_field_errors as string[])?.[0];

    if (platformRestrictionMessage) {
      return platformRestrictionMessage;
    }

    if (errorCode === 'email_not_verified' || code === 'email_not_verified') {
      return typeof data?.message === 'string'
        ? data.message
        : 'Verify your email before logging in.';
    }

    if (errorCode === 'restricted' || state === 'ONLY_SUSPENDED') {
      return [...restrictedOrgs, ...orgSuspendedOrgs]
        .map((notice) => notice.message)
        .join('\n');
    }

    if (errorCode === 'removed' || state === 'ONLY_REVOKED') {
      return removedOrgs.map((notice) => notice.message).join('\n');
    }

    if (errorCode === 'mixed_inactive' || state === 'MIXED_INACTIVE') {
      return [...restrictedOrgs, ...orgSuspendedOrgs, ...removedOrgs]
        .map((notice) => notice.message)
        .join('\n');
    }

    if (errorCode === 'no_active_workspace' || code === 'no_active_workspace') {
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : 'You do not currently have access to any active workspace.';
      return [detail, ...pendingOrgs.map((notice) => notice.message)]
        .filter(Boolean)
        .join('\n');
    }

    return (data?.non_field_errors as string[])?.[0] || '';
  };

  const platformLoginError = (): AppError => ({
    kind: 'permission',
    title: 'Use the platform console.',
    message: 'Platform administrators sign in through the Scholaroscope control plane.',
    retryable: false,
    severity: 'info',
  });

  const invalidCredentialsError = (): AppError => ({
    kind: 'authentication',
    title: 'Login failed.',
    message: 'Email or password is incorrect.',
    retryable: false,
    severity: 'warning',
  });

  const serviceUnavailableError = (): AppError => ({
    kind: 'network',
    title: 'Scholaroscope could not be reached.',
    message: 'Scholaroscope could not be reached. Try again.',
    retryable: true,
    severity: 'error',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlatformLoginRequired(false);
    setVerificationEmail(null);
    setResendMessage(null);
    setLoading(true);

    try {
      if (inviteToken) {
        await acceptInvite(inviteToken, email, password);
        router.replace('/dashboard');
      } else {
        await login(email, password);
        const nextPath = isSafeNextPath(next) ? next : '/dashboard';
        router.replace(nextPath);
      }
    } catch (err: unknown) {
      const e = err as { data?: Record<string, unknown>; message?: string; status?: number };
      const data = e?.data ?? {};
      const errorEnvelope = data.error as { code?: string; message?: string } | undefined;
      if (errorEnvelope?.code === 'platform_login_required') {
        setPlatformLoginRequired(true);
        setError(platformLoginError());
        return;
      }
      if (data.error === 'email_not_verified' || data.code === 'email_not_verified') {
        setVerificationEmail(email);
      }
      if (!e?.status && !Object.keys(data).length) {
        setError(serviceUnavailableError());
        return;
      }
      if (
        [400, 401, 403].includes(e?.status ?? 0)
        && data.error !== 'email_not_verified'
        && data.code !== 'email_not_verified'
        && !data.state
      ) {
        setError(invalidCredentialsError());
        return;
      }
      const resolved = resolveAuthError(err, { action: 'login', entityLabel: 'account access' });
      const interpretedMessage = resolveErrorMessage(data);
      setError({
        ...resolved,
        title: data.error === 'email_not_verified' || data.code === 'email_not_verified'
          ? 'Email verification is required.'
          : resolved.title,
        message: interpretedMessage || resolved.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <div className={themeClasses.authShell}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold theme-text">ScholaroScope</h1>
          <p className="mt-2 theme-muted">Academic Operations System</p>
        </div>

        <div className={themeClasses.authCard}>
          <h2 className="mb-2 text-2xl font-semibold theme-text">
            {inviteToken ? 'Sign in to accept invite' : 'Admin Login'}
          </h2>
          <p className="mb-6 text-sm theme-muted">Use your ScholaroScope account to continue.</p>

          {inviteToken && orgName && (
            <p className="theme-info-surface mb-6 rounded-lg px-3 py-2 text-sm">
              You&apos;ve been invited to join <strong>{decodeURIComponent(orgName)}</strong>. Sign
              in to accept.
            </p>
          )}

          {error && (
            <div className="mb-4">
              <AppErrorBanner error={error} onDismiss={() => setError(null)} />
              {verificationEmail ? (
                <div className="mt-3 rounded-lg border theme-border theme-card-muted p-3 text-sm">
                  <p className="theme-muted">Need a new activation link?</p>
                  {resendMessage ? <p className="mt-2 theme-text">{resendMessage}</p> : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    disabled={resending}
                    onClick={async () => {
                      setResending(true);
                      setResendMessage(null);
                      try {
                        const response = await authAPI.resendVerification(verificationEmail);
                        setResendMessage(response.message);
                      } catch {
                        setResendMessage('Could not resend verification email. Try again shortly.');
                      } finally {
                        setResending(false);
                      }
                    }}
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </Button>
                </div>
              ) : null}
              {platformLoginRequired ? (
                <a
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  href={getPlatformAppUrl('/login')}
                >
                  Open platform console
                </a>
              ) : null}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.com"
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium theme-text">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="theme-link text-xs"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="theme-input w-full rounded-lg px-4 py-2"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading
                ? inviteToken
                  ? 'Signing in & accepting invite...'
                  : 'Signing in...'
                : inviteToken
                  ? 'Sign In & Accept Invite'
                  : 'Sign In'}
            </Button>
          </form>

          <div className="theme-subtle mt-6 text-center text-sm">
            <p>For assistance, contact your system administrator</p>
          </div>
        </div>

        <div className="theme-subtle mt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ScholaroScope. All rights reserved.</p>
        </div>
      </div>
    </AuthFrame>
  );
}

export function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthFrame>
          <div className="theme-card rounded-2xl p-8">
            <LoadingSpinner fullScreen={false} message="Preparing sign-in..." />
          </div>
        </AuthFrame>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
