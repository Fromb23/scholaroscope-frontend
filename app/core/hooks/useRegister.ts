import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { authAPI } from '@/app/core/api/auth';
import { validateInviteToken, ValidatedInvite } from '@/app/core/hooks/useInvites';
import type { OrgType, WorkspaceMode } from '@/app/core/types/auth';

export interface RegisterForm {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    workspace_name: string;
    org_type: WorkspaceMode;
}

export interface RegisterFieldErrors {
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
    workspace_name?: string;
}

export interface SuspendedOrg {
    id: number;
    name: string;
    slug: string;
    org_type: OrgType;
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

    const [form, setForm] = useState<RegisterForm>({
        first_name: '', last_name: '', email: '', password: '', workspace_name: '',
        org_type: 'SCHOOL',
    });
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const hasPersonalWorkspace = memberships.some(
        (membership) => membership.organization.org_type === 'PERSONAL'
    );

    useEffect(() => {
        if (hasPersonalWorkspace && form.org_type === 'PERSONAL') {
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
    };

    const validate = (): boolean => {
        const e: RegisterFieldErrors = {};

        if (isNewWorkspaceFlow || isSuspendedRecovery) {
            if (!form.workspace_name.trim()) e.workspace_name = 'Workspace name is required';
            setFieldErrors(e);
            return Object.keys(e).length === 0;
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

        setFieldErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setApiError(null);

        try {
            // ── New workspace or suspended recovery ───────────────────────
            if (isNewWorkspaceFlow || isSuspendedRecovery) {
                const res = await ctxRegister({
                    workspace_name: form.workspace_name,
                    org_type: form.org_type,
                });
                if (!res.organization) {
                    setApiError('Something went wrong. Please try again.');
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
                        setApiError('Something went wrong. Please try again.');
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

            setSuccess(true);
            setTimeout(() => router.replace('/dashboard'), 1500);

        } catch (err: unknown) {
            const e = err as { data?: Record<string, unknown>; message?: string };
            if (e.data) {
                if (e.data.error && typeof e.data.error === 'object') {
                    const structured = e.data.error as { message?: string };
                    setApiError(structured.message ?? 'Something went wrong.');
                } else {
                    const mapped: RegisterFieldErrors = {};
                    for (const [k, v] of Object.entries(e.data)) {
                        if (k === 'non_field_errors') {
                            setApiError(Array.isArray(v) ? v[0] : String(v));
                        } else {
                            mapped[k as keyof RegisterFieldErrors] = Array.isArray(v) ? v[0] : String(v);
                        }
                    }
                    setFieldErrors(mapped);
                }
            } else {
                setApiError(e.message ?? 'Something went wrong. Please try again.');
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
            const e = err as { message?: string };
            setApiError(e.message ?? 'Failed to restore workspace.');
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
        form, fieldErrors, setField,
        submitting, apiError, setApiError, success,
        handleSubmit, handleRestore, handleLogout, isPending,
        isDirectSignupFlow,
        isPersonalFlow: isDirectSignupFlow,
        hasPersonalWorkspace,
    };
}
