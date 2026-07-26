import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { authAPI } from '@/app/core/api/auth';
import { clearStoredCommercialQuote, readStoredCommercialQuote } from '@/app/core/api/commercialCatalog';
import { workspaceProvisioningAPI } from '@/app/core/api/workspaceProvisioning';
import { validateInviteToken, ValidatedInvite } from '@/app/core/hooks/useInvites';
import { ENABLE_MULTI_WORKSPACE_SIGNUP } from '@/app/core/lib/workspaces';
import type { OrgType, WorkspaceMode } from '@/app/core/types/auth';
import type {
    CommercialOnboardingCompletionOperation,
    CommercialQuote,
} from '@/app/core/types/commercialCatalog';
import { resolveRegistrationError, resolveWorkspaceError, type AppError } from '@/app/core/errors';
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

const REGISTER_INITIAL_WORKSPACE: CommercialOnboardingCompletionOperation = 'REGISTER_INITIAL_WORKSPACE';
const CREATE_ADDITIONAL_WORKSPACE: CommercialOnboardingCompletionOperation = 'CREATE_ADDITIONAL_WORKSPACE';

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
    const {
        user,
        loading: authLoading,
        login,
        logout,
        register: ctxRegister,
        switchOrg,
        restoreWorkspace,
        memberships,
    } = useAuth();

    const inviteToken = searchParams.get('invite');
    const reason = searchParams.get('reason');
    const quoteToken = searchParams.get('quote') ?? searchParams.get('quote_token');

    const isInviteFlow = !!inviteToken;
    const isSuspendedRecovery = reason === 'suspended';
    const isCommercialWorkspaceFlow = !isInviteFlow && !isSuspendedRecovery;
    const authResolved = !isCommercialWorkspaceFlow || !authLoading;
    const operationForCurrentAuthState: CommercialOnboardingCompletionOperation = user
        ? CREATE_ADDITIONAL_WORKSPACE
        : REGISTER_INITIAL_WORKSPACE;
    const [lockedCompletionOperation, setLockedCompletionOperation] = useState<CommercialOnboardingCompletionOperation | null>(null);
    const [operationStateChanged, setOperationStateChanged] = useState(false);
    const completionOperation: CommercialOnboardingCompletionOperation = (
        isCommercialWorkspaceFlow
            ? lockedCompletionOperation ?? operationForCurrentAuthState
            : REGISTER_INITIAL_WORKSPACE
    );
    const isNewWorkspaceFlow = (
        isCommercialWorkspaceFlow
        && authResolved
        && completionOperation === CREATE_ADDITIONAL_WORKSPACE
    );
    const isDirectSignupFlow = (
        isCommercialWorkspaceFlow
        && authResolved
        && completionOperation === REGISTER_INITIAL_WORKSPACE
    );

    const [invite, setInvite] = useState<ValidatedInvite | null>(null);
    const [commercialQuote, setCommercialQuote] = useState<CommercialQuote | null>(null);
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
    const [createdWorkspace, setCreatedWorkspace] = useState<{ id: number; name: string } | null>(null);
    const idempotencyKeyRef = useRef<string | null>(null);
    const idempotencyScopeRef = useRef<string | null>(null);
    const hasPersonalWorkspace = memberships.some(
        (membership) => membership.organization.org_type === 'PERSONAL'
    );
    const missingCommercialQuote = !isInviteFlow && !quoteToken;

    useEffect(() => {
        if (!quoteToken) {
            setCommercialQuote(null);
            return;
        }
        setCommercialQuote(readStoredCommercialQuote(quoteToken));
    }, [quoteToken]);

    useEffect(() => {
        if (!authResolved || !isCommercialWorkspaceFlow) return;
        setLockedCompletionOperation((current) => {
            if (!current) return operationForCurrentAuthState;
            if (current !== operationForCurrentAuthState) {
                setOperationStateChanged(true);
                setApiError(makeRegisterError(
                    'Account state changed.',
                    'Your sign-in state changed while this setup page was open. Restart setup so the correct workspace path is used.',
                    'authentication',
                ));
            }
            return current;
        });
    }, [authResolved, isCommercialWorkspaceFlow, operationForCurrentAuthState]);

    useEffect(() => {
        const scope = `${quoteToken ?? ''}:${completionOperation}`;
        if (idempotencyScopeRef.current !== scope) {
            idempotencyScopeRef.current = scope;
            idempotencyKeyRef.current = null;
        }
    }, [completionOperation, quoteToken]);

    useEffect(() => {
        if (isInviteFlow || quoteToken) return;
        router.replace('/get-started');
    }, [isInviteFlow, quoteToken, router]);

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

    const getSubmissionIdempotencyKey = () => {
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        return idempotencyKeyRef.current;
    };

    const resetSubmissionIdempotencyKey = () => {
        idempotencyKeyRef.current = null;
    };

    const quoteSupportsOperation = () => {
        if (!commercialQuote?.available_completion_operations?.length) return true;
        return commercialQuote.available_completion_operations.includes(completionOperation);
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
        if (!authResolved) {
            setApiError(makeRegisterError(
                'Checking account state.',
                'Wait for account restoration to finish before continuing.',
                'authentication',
            ));
            return;
        }
        if (operationStateChanged) {
            setApiError(makeRegisterError(
                'Restart workspace setup.',
                'Your sign-in state changed while this setup page was open. Restart setup so the correct workspace path is used.',
                'authentication',
            ));
            return;
        }
        if (isCommercialWorkspaceFlow && !quoteSupportsOperation()) {
            setApiError(makeRegisterError(
                'This quote cannot be used for this step.',
                'Return to the rate card and create a quote for the current workspace setup step.',
                'validation',
            ));
            return;
        }
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
                if (!quoteToken) {
                    setApiError(makeRegisterError(
                        'Commercial quote required.',
                        'Choose a workspace type and create a quote before creating another workspace.',
                        'setup_required',
                    ));
                    return;
                }
                if (isNewWorkspaceFlow) {
                    const res = await workspaceProvisioningAPI.createWorkspace({
                        workspace_name: form.workspace_name,
                        quote_token: quoteToken,
                        idempotency_key: getSubmissionIdempotencyKey(),
                    });
                    const newOrganizationId = res.organization?.id;
                    if (!newOrganizationId) {
                        setApiError(makeRegisterError(
                            'Workspace was created but could not be opened.',
                            'The server did not return the new workspace ID. Use the workspace selector, or contact platform support if it does not appear.',
                        ));
                        return;
                    }
                    setCreatedWorkspace({
                        id: newOrganizationId,
                        name: res.organization.name,
                    });
                    try {
                        await switchOrg(newOrganizationId);
                    } catch (switchError: unknown) {
                        const switchAppError = resolveWorkspaceError(switchError, {
                            action: 'switch',
                            entityLabel: 'new freelance workspace',
                        });
                        setApiError({
                            ...switchAppError,
                            title: 'Workspace was created but could not be opened.',
                            message: 'The freelance workspace was created. We could not switch into it automatically. Retry opening it, or use the workspace selector.',
                            actionLabel: 'Open workspace',
                            retryable: true,
                        });
                        return;
                    }
                    clearStoredCommercialQuote(quoteToken);
                    resetSubmissionIdempotencyKey();
                    setSuccess(true);
                    router.replace('/dashboard');
                    return;
                }
                const res = await ctxRegister({
                    workspace_name: form.workspace_name,
                    quote_token: quoteToken,
                    idempotency_key: getSubmissionIdempotencyKey(),
                    completion_operation: completionOperation,
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
            if (!quoteToken) {
                setApiError(makeRegisterError(
                    'Commercial quote required.',
                    'Choose Standard or Premium from the rate card before registering.',
                    'setup_required',
                ));
                return;
            }
            const res = await ctxRegister({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                password: form.password,
                workspace_name: form.workspace_name,
                org_type: form.org_type,
                quote_token: quoteToken,
                idempotency_key: getSubmissionIdempotencyKey(),
                completion_operation: completionOperation,
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
                clearStoredCommercialQuote(quoteToken);
                resetSubmissionIdempotencyKey();
                return;
            }

            setSuccess(true);
            clearStoredCommercialQuote(quoteToken);
            resetSubmissionIdempotencyKey();
            setTimeout(() => router.replace('/dashboard'), 1500);

        } catch (err: unknown) {
            const appError = isInviteFlow
                ? resolveRegistrationError(err, {
                    action: 'verify',
                    entityLabel: 'account invitation',
                })
                : completionOperation === CREATE_ADDITIONAL_WORKSPACE
                  ? resolveWorkspaceError(err, {
                    action: 'create',
                    entityLabel: 'additional workspace',
                    workspaceBehavior: 'FREELANCE_TEACHER',
                })
                  : resolveRegistrationError(err, {
                    action: 'submit',
                    entityLabel: 'workspace registration',
                    workspaceBehavior: form.org_type === 'PERSONAL' ? 'FREELANCE_TEACHER' : null,
                });
            if (appError.fieldErrors) {
                const mappedErrors = mapRegisterFieldErrors(appError.fieldErrors);
                if (hasFormFieldErrors(mappedErrors)) {
                    setFieldErrors(mappedErrors);
                    setFormValidationError(createFormValidationAppError({
                        fieldErrors: normalizeFormFieldErrors(mappedErrors),
                    }));
                    setApiError(null);
                    return;
                }
            }
            setApiError(appError);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenCreatedWorkspace = async () => {
        if (!createdWorkspace) return;
        setSubmitting(true);
        setApiError(null);
        try {
            await switchOrg(createdWorkspace.id);
            clearStoredCommercialQuote(quoteToken);
            resetSubmissionIdempotencyKey();
            setSuccess(true);
            router.replace('/dashboard');
        } catch (err: unknown) {
            const switchAppError = resolveWorkspaceError(err, {
                action: 'switch',
                entityLabel: 'new freelance workspace',
            });
            setApiError({
                ...switchAppError,
                title: 'Workspace was created but could not be opened.',
                message: 'The freelance workspace was created. We could not switch into it automatically. Retry opening it, or use the workspace selector.',
                actionLabel: 'Open workspace',
                retryable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenExistingPersonalWorkspace = async () => {
        const existingWorkspace = apiError?.serverContext?.existing_workspace;
        const existingWorkspaceId = (
            existingWorkspace
            && typeof existingWorkspace === 'object'
            && 'id' in existingWorkspace
            && typeof existingWorkspace.id === 'number'
        ) ? existingWorkspace.id : null;
        if (!existingWorkspaceId) {
            router.push('/dashboard');
            return;
        }
        setSubmitting(true);
        try {
            await switchOrg(existingWorkspaceId);
            router.replace('/dashboard');
        } catch (err: unknown) {
            setApiError(resolveWorkspaceError(err, {
                action: 'switch',
                entityLabel: 'existing freelance workspace',
            }));
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
        handleOpenCreatedWorkspace,
        handleOpenExistingPersonalWorkspace,
        createdWorkspace,
        isDirectSignupFlow,
        completionOperation,
        authLoading,
        isPersonalFlow: commercialQuote?.workspace_type === 'PERSONAL' || isDirectSignupFlow,
        hasPersonalWorkspace,
        quoteToken,
        commercialQuote,
        missingCommercialQuote,
    };
}
