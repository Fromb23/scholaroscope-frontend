// app/(auth)/register/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, User, ArrowLeft,
    CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { useRegister } from '@/app/core/hooks/useRegister';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

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

function RegisterForm() {
    const router = useRouter();
    const {
        isPersonalFlow, isInviteFlow, isNewWorkspaceFlow, isSuspendedRecovery,
        isExistingUser, invite, inviteError, inviteLoading,
        suspendedOrgs, restoring,
        form, fieldErrors, setField,
        submitting, apiError, setApiError, success,
        handleSubmit, handleRestore, handleLogout,
    } = useRegister();

    // ── Loading ───────────────────────────────────────────────────────────
    if (inviteLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <LoadingSpinner message="Validating invite..." />
            </div>
        );
    }

    // ── Invalid invite ────────────────────────────────────────────────────
    if (isInviteFlow && inviteError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
                    <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-7 w-7 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Invite Invalid</h2>
                    <p className="text-sm text-gray-500 mt-2">{inviteError}</p>
                    <button onClick={() => router.push('/login')}
                        className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto">
                        <ArrowLeft className="h-4 w-4" /> Back to login
                    </button>
                </div>
            </div>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
                    <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isSuspendedRecovery ? 'Workspace restored!' : isInviteFlow ? "You're in!" : 'Workspace created!'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        {isInviteFlow
                            ? `Welcome to ${invite?.organization}. Redirecting...`
                            : 'Redirecting to your dashboard...'}
                    </p>
                </div>
            </div>
        );
    }

    // ── Suspended recovery ────────────────────────────────────────────────
    if (isSuspendedRecovery) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-bold text-blue-600">ScholaroScope</h1>
                    </div>

                    <div className="rounded-2xl bg-white p-8 shadow-xl">
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-800">Workspace Recovery</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                All your workspaces are suspended. Restore one or create a new one.
                            </p>
                        </div>

                        {apiError && (
                            <div className="mb-4">
                                <ErrorBanner message={apiError} onDismiss={() => setApiError(null)} />
                            </div>
                        )}

                        {/* Suspended workspaces list */}
                        {suspendedOrgs.length > 0 && (
                            <div className="mb-6">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                                    Suspended Workspaces
                                </p>
                                <div className="space-y-2">
                                    {suspendedOrgs.map(org => (
                                        <div key={org.id}
                                            className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center">
                                                    <Building2 className="h-4 w-4 text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{org.name}</p>
                                                    <p className="text-xs text-gray-400 capitalize">
                                                        {org.org_type.toLowerCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleRestore(org.id)}
                                                disabled={!!restoring}
                                                variant="secondary"
                                            >
                                                {restoring === org.id
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : 'Restore'
                                                }
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-3 text-gray-400 uppercase tracking-wide">or</span>
                            </div>
                        </div>

                        {/* Create new workspace */}
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-700">Create a new workspace</p>
                            <Input
                                label="Workspace Name"
                                id="workspace_name"
                                value={form.workspace_name}
                                onChange={e => setField('workspace_name', e.target.value)}
                                placeholder="e.g. Sunrise Academy"
                                error={fieldErrors.workspace_name}
                            />
                            <p className="text-xs text-gray-400 -mt-2">
                                This becomes your new organization name
                            </p>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !!restoring}
                                className="w-full"
                            >
                                {submitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                                    : 'Create New Workspace'
                                }
                            </Button>
                        </div>

                        <div className="mt-6">
                            <button onClick={handleLogout}
                                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                                <ArrowLeft className="h-3.5 w-3.5" /> Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Standard flows (personal / invite / new_workspace) ────────────────
    const title = isNewWorkspaceFlow
        ? 'New Workspace'
        : isInviteFlow
            ? (isExistingUser ? 'Accept Invitation' : 'Create Your Account')
            : 'Create Workspace';

    const subtitle = isNewWorkspaceFlow
        ? 'Add a new workspace to your account'
        : isInviteFlow
            ? (isExistingUser ? 'Sign in to accept this invitation' : 'Fill in your details to join')
            : 'Start your personal workspace — free forever';

    const submitLabel = isNewWorkspaceFlow
        ? 'Create Workspace'
        : isInviteFlow
            ? (isExistingUser ? 'Accept & Sign In' : 'Create Account & Join')
            : 'Create Workspace';

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
            <div className="w-full max-w-md">

                {!isNewWorkspaceFlow && (
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-bold text-blue-600">ScholaroScope</h1>
                        <p className="mt-2 text-gray-600">Academic Operations System</p>
                    </div>
                )}

                <div className="rounded-2xl bg-white p-8 shadow-xl">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    </div>

                    {isInviteFlow && invite && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-blue-900">
                                        You've been invited to join {invite.organization}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        You'll join as{' '}
                                        <span className="font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</span>
                                        {' '}· Expires{' '}
                                        {new Date(invite.expires_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric',
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
                                    onChange={e => setField('workspace_name', e.target.value)}
                                    placeholder="e.g. Sunrise Academy"
                                    error={fieldErrors.workspace_name}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Workspace Type
                                    </label>
                                    <select
                                        value={form.org_type}
                                        onChange={e => setField('org_type', e.target.value as RegisterFormData['org_type'])}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PERSONAL">Personal</option>
                                        <option value="SCHOOL">School / Institution</option>
                                        <option value="BUSINESS">Business</option>
                                    </select>
                                </div>
                                <p className="text-xs text-gray-400 -mt-2">
                                    This becomes your new organization name
                                </p>
                            </>
                        )}

                        {!isNewWorkspaceFlow && (
                            <>
                                {!isExistingUser && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="First Name" id="first_name"
                                            value={form.first_name}
                                            onChange={e => setField('first_name', e.target.value)}
                                            placeholder="Ada" error={fieldErrors.first_name}
                                        />
                                        <Input
                                            label="Last Name" id="last_name"
                                            value={form.last_name}
                                            onChange={e => setField('last_name', e.target.value)}
                                            placeholder="Lovelace" error={fieldErrors.last_name}
                                        />
                                    </div>
                                )}

                                <Input
                                    label="Email Address" id="email" type="email"
                                    value={form.email}
                                    onChange={e => setField('email', e.target.value)}
                                    placeholder="ada@example.com"
                                    disabled={isInviteFlow && !!invite?.email}
                                    error={fieldErrors.email}
                                />
                                {isInviteFlow && !!invite?.email && (
                                    <p className="text-xs text-gray-400 -mt-2">Email is fixed by the invite</p>
                                )}

                                <Input
                                    label="Password" id="password" type="password"
                                    value={form.password}
                                    onChange={e => setField('password', e.target.value)}
                                    placeholder="Min. 8 characters" error={fieldErrors.password}
                                />

                                {isPersonalFlow && (
                                    <>
                                        <Input
                                            label="Workspace Name" id="workspace_name"
                                            value={form.workspace_name}
                                            onChange={e => setField('workspace_name', e.target.value)}
                                            placeholder="Ada's Tutoring Centre"
                                            error={fieldErrors.workspace_name}
                                        />
                                        <p className="text-xs text-gray-400 -mt-2">
                                            This becomes your personal organization name
                                        </p>
                                    </>
                                )}

                                {isInviteFlow && invite && (
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <User className="h-4 w-4 text-gray-400 shrink-0" />
                                        <span className="text-sm text-gray-600">
                                            You'll join as{' '}
                                            <span className="font-medium text-gray-800">
                                                {ROLE_LABEL[invite.role] ?? invite.role}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-2">
                            {submitting
                                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                                : submitLabel
                            }
                        </Button>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm">
                        <button onClick={() => router.back()}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {isNewWorkspaceFlow ? 'Cancel' : 'Back to login'}
                        </button>
                        {isPersonalFlow && (
                            <span className="text-xs text-gray-400">
                                Have an invite? Use the invite link directly
                            </span>
                        )}
                    </div>
                </div>

                {!isNewWorkspaceFlow && (
                    <div className="mt-8 text-center text-sm text-gray-600">
                        <p>&copy; 2025 ScholaroScope. All rights reserved.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <LoadingSpinner message="Loading..." />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}