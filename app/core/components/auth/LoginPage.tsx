'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import {
  isPlatformSuperadminBlockedPath,
  roleHomeRoute,
} from '@/app/utils/routeAccess';
import type { AccessNotice } from '@/app/core/types/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const { login, acceptInvite } = useAuth();
  const router = useRouter();

  const inviteToken = searchParams.get('invite');
  const orgName = searchParams.get('org');
  const next = searchParams.get('next');

  useEffect(() => {
    if (searchParams.get('reason') === 'suspended') {
      setError(
        'Your organization has been suspended. Contact your administrator for more information.',
      );
    } else if (searchParams.get('reason') === 'no_access') {
      setError('You do not currently have access to any active workspace.');
    }
  }, [searchParams]);

  useEffect(() => {
    const inviteEmail = searchParams.get('email');
    if (inviteEmail) setEmail(inviteEmail);
  }, [searchParams]);

  const resolveErrorMessage = (data: Record<string, unknown>): string => {
    const state = data?.state as string;
    const errorCode = data?.error as string;
    const restrictedOrgs = (data?.restricted_orgs as AccessNotice[]) ?? [];
    const orgSuspendedOrgs = (data?.org_suspended_orgs as AccessNotice[]) ?? [];
    const removedOrgs = (data?.removed_orgs as AccessNotice[]) ?? [];
    const pendingOrgs = (data?.pending_orgs as AccessNotice[]) ?? [];
    const platformRestrictionMessage = (data?.non_field_errors as string[])?.[0];

    if (platformRestrictionMessage) {
      return platformRestrictionMessage;
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

    if (errorCode === 'no_active_workspace') {
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : 'You do not currently have access to any active workspace.';
      return [detail, ...pendingOrgs.map((notice) => notice.message)]
        .filter(Boolean)
        .join('\n');
    }

    return (data?.non_field_errors as string[])?.[0] || 'Login failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (inviteToken) {
        await acceptInvite(inviteToken, email, password);
        router.replace('/dashboard');
      } else {
        const response = await login(email, password);
        const nextPath = isSafeNextPath(next) ? next : '/dashboard';
        const redirectTarget = (
          response.user.is_superadmin
          && !response.active_org
          && isPlatformSuperadminBlockedPath(nextPath)
        )
          ? roleHomeRoute.SUPERADMIN
          : nextPath;
        router.replace(redirectTarget);
      }
    } catch (err: unknown) {
      const e = err as { data?: Record<string, unknown>; message?: string };
      const data = e?.data ?? {};
      setError(resolveErrorMessage(data) || e?.message || 'Login failed. Please try again.');
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
              <ErrorBanner message={error} onDismiss={() => setError('')} />
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
            <LoadingSpinner fullScreen={false} message="Loading..." />
          </div>
        </AuthFrame>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
