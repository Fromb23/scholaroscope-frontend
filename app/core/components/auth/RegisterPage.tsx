// app/(auth)/register/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRegister } from '@/app/core/hooks/useRegister';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  INSTRUCTOR: 'Instructor',
};

type RegisterFormData = {
  org_type: string;
  workspace_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

function AuthBrand() {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-4xl font-bold theme-text">ScholaroScope</h1>
      <p className="mt-2 theme-muted">Academic Operations System</p>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const {
    isPersonalFlow,
    isInviteFlow,
    isNewWorkspaceFlow,
    isSuspendedRecovery,
    isExistingUser,
    invite,
    inviteError,
    inviteLoading,
    suspendedOrgs,
    restoring,
    form,
    fieldErrors,
    setField,
    submitting,
    apiError,
    setApiError,
    success,
    handleSubmit,
    handleRestore,
    handleLogout,
    isPending,
  } = useRegister();

  if (inviteLoading) {
    return (
      <AuthFrame>
        <div className="theme-card rounded-2xl p-8">
          <LoadingSpinner fullScreen={false} message="Validating invite..." />
        </div>
      </AuthFrame>
    );
  }

  if (isInviteFlow && inviteError) {
    return (
      <AuthFrame>
        <div className="theme-card mx-auto w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold theme-text">Invite Invalid</h2>
          <p className="theme-muted mt-2 text-sm">{inviteError}</p>
          <button
            onClick={() => router.push('/login')}
            className="theme-link mx-auto mt-6 flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </button>
        </div>
      </AuthFrame>
    );
  }

  if (success) {
    return (
      <AuthFrame>
        <div className="theme-card mx-auto w-full max-w-md rounded-2xl p-8 text-center">
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              isPending ? 'bg-yellow-100' : 'bg-green-100'
            }`}
          >
            {isPending ? (
              <AlertCircle className="h-7 w-7 text-yellow-600" />
            ) : (
              <CheckCircle className="h-7 w-7 text-green-600" />
            )}
          </div>
          <h2 className="text-xl font-semibold theme-text">
            {isPending
              ? 'Workspace request submitted'
              : isSuspendedRecovery
                ? 'Workspace restored!'
                : isInviteFlow
                  ? "You're in!"
                  : 'Workspace request submitted'}
          </h2>
          <p className="theme-muted mt-2 text-sm">
            {isPending
              ? 'Platform approval is required before this workspace becomes active.'
              : isInviteFlow
                ? `Welcome to ${invite?.organization}. Redirecting...`
                : 'Redirecting to your dashboard...'}
          </p>
          {isPending && (
            <button
              onClick={() => router.push('/login')}
              className="theme-link mx-auto mt-6 flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
          )}
        </div>
      </AuthFrame>
    );
  }

  if (isSuspendedRecovery) {
    return (
      <AuthFrame>
        <div className="w-full max-w-md">
          <AuthBrand />

          <div className={themeClasses.authCard}>
            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold theme-text">Workspace Recovery</h2>
              <p className="theme-muted mt-1 text-sm">
                All your workspaces are suspended. Restore one or create a new one.
              </p>
            </div>

            {apiError && (
              <div className="mb-4">
                <ErrorBanner message={apiError} onDismiss={() => setApiError(null)} />
              </div>
            )}

            {suspendedOrgs.length > 0 && (
              <div className="mb-6">
                <p className="theme-subtle mb-3 text-xs font-semibold uppercase tracking-wide">
                  Suspended Workspaces
                </p>
                <div className="space-y-2">
                  {suspendedOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="theme-card-muted flex items-center justify-between rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200">
                          <Building2 className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium theme-text">{org.name}</p>
                          <p className="theme-subtle text-xs capitalize">
                            {org.org_type.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRestore(org.id)}
                        disabled={!!restoring}
                        variant="secondary"
                      >
                        {restoring === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Restore'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="theme-surface theme-subtle px-3 uppercase tracking-wide">or</span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium theme-text">Create a new workspace</p>
              <Input
                label="Workspace Name"
                id="workspace_name"
                value={form.workspace_name}
                onChange={(e) => setField('workspace_name', e.target.value)}
                placeholder="e.g. Sunrise Academy"
                error={fieldErrors.workspace_name}
              />
              <p className="theme-subtle -mt-2 text-xs">This becomes your new organization name</p>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !!restoring}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create New Workspace'
                )}
              </Button>
            </div>

            <div className="mt-6">
              <button
                onClick={handleLogout}
                className="theme-muted flex items-center gap-1 text-sm hover:text-gray-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </AuthFrame>
    );
  }

  const title = isNewWorkspaceFlow
    ? 'Request New Workspace'
    : isInviteFlow
      ? isExistingUser
        ? 'Accept Invitation'
        : 'Create Your Account'
      : 'Create Your Account';

  const subtitle = isNewWorkspaceFlow
    ? 'Submit a new workspace request for platform approval'
    : isInviteFlow
      ? isExistingUser
        ? 'Sign in to accept this invitation'
        : 'Fill in your details to join'
      : 'Register yourself and your organization on ScholaroScope';

  const submitLabel = isNewWorkspaceFlow
    ? 'Request Workspace'
    : isInviteFlow
      ? isExistingUser
        ? 'Accept & Sign In'
        : 'Create Account & Join'
      : 'Request Workspace';

  return (
    <AuthFrame>
      <div className="w-full max-w-md">
        {!isNewWorkspaceFlow && <AuthBrand />}

        <div className={themeClasses.authCard}>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold theme-text">{title}</h2>
            <p className="theme-muted mt-1 text-sm">{subtitle}</p>
          </div>

          {isInviteFlow && invite && (
            <div className="theme-info-surface mb-6 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    You&apos;ve been invited to join {invite.organization}
                  </p>
                  <p className="mt-0.5 text-xs text-blue-700">
                    You&apos;ll join as{' '}
                    <span className="font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</span> ·
                    Expires{' '}
                    {new Date(invite.expires_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {apiError && (
            <div className="mb-4">
              <ErrorBanner message={apiError} onDismiss={() => setApiError(null)} />
            </div>
          )}

          <div className="space-y-4">
            {isNewWorkspaceFlow && (
              <>
                <Input
                  label="Workspace Name"
                  id="workspace_name"
                  value={form.workspace_name}
                  onChange={(e) => setField('workspace_name', e.target.value)}
                  placeholder="e.g. Sunrise Academy"
                  error={fieldErrors.workspace_name}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium theme-text">
                    Workspace Type
                  </label>
                  <select
                    value={form.org_type}
                    onChange={(e) =>
                      setField('org_type', e.target.value as RegisterFormData['org_type'])
                    }
                    className="theme-input w-full rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="SCHOOL">School / Institution</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
                <p className="theme-subtle -mt-2 text-xs">
                  This becomes your new organization name
                </p>
              </>
            )}

            {!isNewWorkspaceFlow && (
              <>
                {!isExistingUser && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      id="first_name"
                      value={form.first_name}
                      onChange={(e) => setField('first_name', e.target.value)}
                      placeholder="Ada"
                      error={fieldErrors.first_name}
                    />
                    <Input
                      label="Last Name"
                      id="last_name"
                      value={form.last_name}
                      onChange={(e) => setField('last_name', e.target.value)}
                      placeholder="Lovelace"
                      error={fieldErrors.last_name}
                    />
                  </div>
                )}

                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="ada@example.com"
                  disabled={isInviteFlow && !!invite?.email}
                  error={fieldErrors.email}
                />
                {isInviteFlow && !!invite?.email && (
                  <p className="theme-subtle -mt-2 text-xs">Email is fixed by the invite</p>
                )}

                <Input
                  label="Password"
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  error={fieldErrors.password}
                />

                {isPersonalFlow && (
                  <>
                    <Input
                      label="Workspace Name"
                      id="workspace_name"
                      value={form.workspace_name}
                      onChange={(e) => setField('workspace_name', e.target.value)}
                      placeholder="e.g. Sunrise Academy"
                      error={fieldErrors.workspace_name}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium theme-text">
                        Organization Type
                      </label>
                      <select
                        value={form.org_type}
                        onChange={(e) =>
                          setField('org_type', e.target.value as RegisterFormData['org_type'])
                        }
                        className="theme-input w-full rounded-lg px-4 py-2 text-sm"
                      >
                        <option value="SCHOOL">School / Institution</option>
                        <option value="BUSINESS">Business</option>
                        <option value="PERSONAL">Personal</option>
                      </select>
                    </div>
                    <p className="theme-subtle -mt-2 text-xs">
                      This becomes your organization name on ScholaroScope
                    </p>
                  </>
                )}

                {isInviteFlow && invite && (
                  <div className="theme-card-muted flex items-center gap-2 rounded-lg p-3">
                    <User className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="text-sm theme-muted">
                      You&apos;ll join as{' '}
                      <span className="font-medium theme-text">
                        {ROLE_LABEL[invite.role] ?? invite.role}
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="mt-2 w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => router.back()}
              className="theme-link flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isNewWorkspaceFlow ? 'Cancel' : 'Back to login'}
            </button>
            {isPersonalFlow && (
              <span className="theme-subtle text-xs">
                Have an invite? Use the invite link directly
              </span>
            )}
          </div>
        </div>

        {!isNewWorkspaceFlow && (
          <div className="theme-subtle mt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} ScholaroScope. All rights reserved.</p>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}

export function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  );
}
