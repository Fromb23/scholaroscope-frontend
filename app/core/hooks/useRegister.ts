import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { authAPI } from '@/app/core/api/auth';
import { validateInviteToken, ValidatedInvite } from '@/app/core/hooks/useInvites';
import { ENABLE_MULTI_WORKSPACE_SIGNUP } from '@/app/core/lib/workspaces';
import type { OrgType, WorkspaceMode } from '@/app/core/types/auth';
import { resolveAuthError, resolveWorkspaceError, type AppError } from '@/app/core/errors';
import {
    createFormValidationAppError,
    hasFormFieldErrors,
    normalizeFormFieldErrors,
    type FormFieldErrors,
} from '@/app/core/forms';

export interface RegisterForm {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    workspace_name: string;
    org_type: WorkspaceMode;
}

export type RegisterField = 'first_name' | 'last_name' | 'email' | 'password' | 'workspace_name';
export type RegisterFieldErrors = FormFieldErrors<RegisterField>;

export interface SuspendedOrg {
    id: number;
    name: string;
    slug: string;
    org_type: OrgType;
}

function makeRegisterError(title: string, message: string, kind: AppError['kind'] = 'server'): AppError {
    return {
        kind,
        title,
        message,
        retryable: kind === 'server' || kind === 'network',
        severity: kind === 'validation' || kind === 'setup_required' ? 'warning' : 'error',
        actionLabel: kind === 'server' || kind === 'network' ? 'Try again' : undefined,
    };
}

function mapRegisterFieldErrors(fieldErrors: Record<string, string[]>): RegisterFieldErrors {
    const mapped: RegisterFieldErrors = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
        if (field === 'first_name' || field === 'last_name' || field === 'email' || field === 'password' || field === 'workspace_name') {
            mapped[field] = messages[0] ?? 'Check this field';
        }
    }
    return mapped;
}

export function useRegister() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, logout, register: ctxRegister, restoreWorkspace, memberships } = useAuth();

    const inviteToken = searchParams.get('invite');
    const mode = searchParams.get('mode');
    const reason = searchParams.get('reason');

    const isNewWorkspaceFlow = mode === 'new_workspace';
    const isInviteFlow = !!inviteToken;
    const isSuspendedRecovery = reason === 'suspended';
    const isDirectSignupFlow = !isInviteFlow && !isNewWorkspaceFlow;

    const [invite, setInvite] = useState<ValidatedInvite | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(isInviteFlow);
    const [suspendedOrgs, setSuspendedOrgs] = useState<SuspendedOrg[]>([]);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [verificationRequired, setVerificationRequired] = useState<{
        email: string;
        expiresInDays: number;
        message: string;
    } | null>(null);

    const [form, setForm] = useState<RegisterForm>({
        first_name: '', last_name: '', email: '', password: '', workspace_name: '',
        org_type: 'PERSONAL',
    });
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
    const [formValidationError, setFormValidationError] = useState<AppError | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<AppError | null>(null);
    const [success, setSuccess] = useState(false);
    const hasPersonalWorkspace = memberships.some(
        (membership) => membership.organization.org_type === 'PERSONAL'
    );

    useEffect(() => {
        if (ENABLE_MULTI_WORKSPACE_SIGNUP && hasPersonalWorkspace && form.org_type === 'PERSONAL') {
            setForm(f => ({ ...f, org_type: 'SCHOOL' }));
        }
    }, [form.org_type, hasPersonalWorkspace]);

    useEffect(() => {
        if (!isSuspendedRecovery) return;
        authAPI.getSuspendedWorkspaces()
            .then(data => setSuspendedOrgs(data))
            .catch(() => { });
    }, [isSuspendedRecovery]);

    useEffect(() => {
        if (!inviteToken) return;
        setInviteLoading(true);
        validateInviteToken(inviteToken)
            .then(data => {
                if (data.user_exists) {
                    router.replace(`/login?invite=${inviteToken}&org=${encodeURIComponent(data.organization)}`);
                    return;
                }
                setInvite(data);
                if (data.email) setForm(f => ({ ...f, email: data.email }));
            })
            .catch(err => {
                setInviteError(err.data?.detail ?? 'This invite link is invalid or has expired.');
            })
            .finally(() => setInviteLoading(false));
    }, [inviteToken, router]);

    const setField = (key: keyof RegisterForm, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
        if (key in fieldErrors && fieldErrors[key as keyof RegisterFieldErrors]) {
            setFieldErrors(e => ({ ...e, [key as keyof RegisterFieldErrors]: undefined }));
        }
        if (formValidationError?.fieldErrors?.[key]) {
            setFormValidationError(null);
        }
        if (apiError?.fieldErrors?.[key]) {
            setApiError(null);
        }
    };

    const validate = (): FormFieldErrors<RegisterField> => {
        const e: RegisterFieldErrors = {};

        if (isNewWorkspaceFlow || isSuspendedRecovery) {
            if (!form.workspace_name.trim()) e.workspace_name = 'Workspace name is required';
            return e;
        }

        const isExistingUser = !!invite?.user_exists;

        if (!form.email.trim()) {
            e.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = 'Enter a valid email';
        }

        if (!form.password) {
            e.password = 'Password is required';
        } else if (form.password.length < 8) {
            e.password = 'Password must be at least 8 characters';
        }

        if (!isExistingUser) {
            if (!form.first_name.trim()) e.first_name = 'First name is required';
            if (!form.last_name.trim()) e.last_name = 'Last name is required';
        }

        if (isDirectSignupFlow && !form.workspace_name.trim()) {
            e.workspace_name = 'Workspace name is required';
        }

        return e;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        setFieldErrors(validationErrors);
        if (hasFormFieldErrors(validationErrors)) {
            setFormValidationError(createFormValidationAppError({
                fieldErrors: normalizeFormFieldErrors(validationErrors),
            }));
            return;
        }
        setSubmitting(true);
        setFormValidationError(null);
        setApiError(null);

        try {
            // ── New workspace or suspended recovery ───────────────────────
            if (isNewWorkspaceFlow || isSuspendedRecovery) {
                if (!ENABLE_MULTI_WORKSPACE_SIGNUP && form.org_type !== 'PERSONAL') {
                    setApiError(makeRegisterError(
                        'Workspace request is not available.',
                        'Public multi-workspace signup is not available yet. Ask platform support to enable this workflow.',
                        'setup_required',
                    ));
                    return;
                }
                const res = await ctxRegister({
                    workspace_name: form.workspace_name,
                    org_type: form.org_type,
                });
                if (!res.organization) {
                    setApiError(makeRegisterError(
                        'Workspace was not created.',
                        'The server did not return a workspace for this request. Try again, or contact platform support if it continues.',
                    ));
                    return;
                }
                if (res.status === 'pending') {
                    setIsPending(true);
                    setSuccess(true);
                    setTimeout(() => { router.replace('/dashboard'); }, 1500);
                    return;
                }
                setSuccess(true);
                setTimeout(() => { router.replace('/dashboard'); }, 1500);
                return;
            }

            // ── Invite flow ───────────────────────────────────────────────
            if (isInviteFlow && inviteToken) {
                const isExistingUser = !!invite?.user_exists;
                if (isExistingUser) {
                    await login(form.email, form.password);
                    await ctxRegister({
                        email: form.email,
                        password: form.password,
                        invite_code: inviteToken,
                    });
                } else {
                    const res = await ctxRegister({
                        first_name: form.first_name,
                        last_name: form.last_name,
                        org_type: form.org_type,
                        email: form.email,
                        password: form.password,
                        invite_code: inviteToken,
                    });
                    if (!res.access) {
                        setApiError(makeRegisterError(
                            'Account was not created.',
                            'The invite was accepted by the server, but account access was not returned. Try again, or contact platform support if it continues.',
                        ));
                        return;
                    }
                }
                setSuccess(true);
                setTimeout(() => router.replace('/dashboard'), 1500);
                return;
            }

            // ── Personal flow (direct signup) ─────────────────────────────
            const res = await ctxRegister({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                password: form.password,
                workspace_name: form.workspace_name,
                org_type: form.org_type,
            });

            if (res.status === 'pending') {
                setIsPending(true);
                setSuccess(true);
                return;
            }

            if (res.status === 'email_verification_required') {
                setVerificationRequired({
                    email: res.email ?? form.email,
                    expiresInDays: res.expires_in_days ?? 3,
                    message: res.message ?? 'Check your email to activate your Freelance Teacher Workspace.',
                });
                setSuccess(true);
                return;
            }

            setSuccess(true);
            setTimeout(() => router.replace('/dashboard'), 1500);

        } catch (err: unknown) {
            const appError = isInviteFlow
                ? resolveAuthError(err, {
                    action: 'verify',
                    entityLabel: 'account invitation',
                })
                : resolveWorkspaceError(err, {
                    action: 'create',
                    entityLabel: 'workspace',
                    workspaceBehavior: form.org_type === 'PERSONAL' ? 'FREELANCE_TEACHER' : null,
                });
            setApiError(appError);
            if (appError.fieldErrors) {
                setFieldErrors(mapRegisterFieldErrors(appError.fieldErrors));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestore = async (orgId: number) => {
        setRestoring(orgId);
        setApiError(null);
        try {
            await restoreWorkspace(orgId);
            setSuccess(true);
            setTimeout(() => { router.replace('/dashboard'); }, 1500);
        } catch (err: unknown) {
            setApiError(resolveWorkspaceError(err, {
                action: 'switch',
                entityLabel: 'workspace access',
            }));
        } finally {
            setRestoring(null);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    return {
        isInviteFlow, isNewWorkspaceFlow, isSuspendedRecovery,
        isExistingUser: !!invite?.user_exists,
        invite, inviteError, inviteLoading,
        suspendedOrgs, restoring,
        verificationRequired,
        form, fieldErrors, setField,
        formValidationError,
        submitting, apiError, setApiError, success,
        handleSubmit, handleRestore, handleLogout, isPending,
        isDirectSignupFlow,
        isPersonalFlow: isDirectSignupFlow,
        hasPersonalWorkspace,
    };
}
