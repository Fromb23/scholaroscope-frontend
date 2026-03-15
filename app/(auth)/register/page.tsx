// ============================================================================
// app/(auth)/register/page.tsx
//
// Two flows in one page:
//   1. Personal workspace — no invite, creates org + user
//   2. Invite acceptance  — ?invite=TOKEN in URL
//      a. New user    → full registration form
//      b. Existing user → email + password only (login + join)
// ============================================================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, User, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { validateInviteToken, ValidatedInvite } from '@/app/core/hooks/useInvites';
import { authAPI } from '@/app/core/api/auth';
import { useAuth } from '@/app/context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'Administrator',
    INSTRUCTOR: 'Instructor',
};

// ── Field component ───────────────────────────────────────────────────────────

function Field({
    label, id, type = 'text', value, onChange, error, placeholder, disabled, hint,
}: {
    label: string;
    id: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    hint?: string;
}) {
    const [show, setShow] = useState(false);
    const isPassword = type === 'password';

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={isPassword ? (show ? 'text' : 'password') : type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors
            ${isPassword ? 'pr-10' : ''}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                />
                {isPassword && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
    );
}

// ── Invite banner ─────────────────────────────────────────────────────────────

function InviteBanner({ invite }: { invite: ValidatedInvite }) {
    return (
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
                        You'll be added as <span className="font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</span>
                        {' '}· Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const inviteToken = searchParams.get('invite');

    // Invite validation state
    const [invite, setInvite] = useState<ValidatedInvite | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

    // Form state
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        workspace_name: '',
    });
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // ── Validate invite token on mount ──────────────────────────────────────────

    useEffect(() => {
        if (!inviteToken) return;
        setInviteLoading(true);
        validateInviteToken(inviteToken)
            .then(data => {
                setInvite(data);
                // Pre-fill email if invite specifies one
                if (data.email) setForm(f => ({ ...f, email: data.email }));
            })
            .catch(err => {
                setInviteError(err.data?.detail ?? 'This invite link is invalid or has expired.');
            })
            .finally(() => setInviteLoading(false));
    }, [inviteToken]);

    // ── Derived flags ────────────────────────────────────────────────────────────

    // Invite path: user already has an account → only need email + password
    const isExistingUser = !!invite?.user_exists;
    const isInviteFlow = !!inviteToken && !!invite;
    const isPersonalFlow = !inviteToken;

    // ── Validation ───────────────────────────────────────────────────────────────

    const validate = () => {
        const e: Partial<typeof form> = {};

        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';

        if (!form.password) e.password = 'Password is required';
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';

        if (!isExistingUser) {
            if (!form.first_name.trim()) e.first_name = 'First name is required';
            if (!form.last_name.trim()) e.last_name = 'Last name is required';
        }

        if (isPersonalFlow && !form.workspace_name.trim()) {
            e.workspace_name = 'Workspace name is required';
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ────────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setApiError(null);

        try {
            if (isInviteFlow) {
                // Path A: invite flow — register (new) or login then join (existing)
                if (isExistingUser) {
                    // Existing user: login first, then register with invite_code to join org
                    await login(form.email, form.password);
                    await authAPI.register({
                        email: form.email,
                        password: form.password,
                        invite_code: inviteToken!,
                    });
                } else {
                    // New user: register with invite_code
                    const res = await authAPI.register({
                        first_name: form.first_name,
                        last_name: form.last_name,
                        email: form.email,
                        password: form.password,
                        invite_code: inviteToken!,
                    });
                    // Store tokens from register response
                    localStorage.setItem('access_token', res.access);
                    localStorage.setItem('refresh_token', res.refresh);
                }
                setSuccess(true);
                setTimeout(() => router.replace('/dashboard'), 2000);
            } else {
                // Path B: personal workspace signup
                const res = await authAPI.register({
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    password: form.password,
                    workspace_name: form.workspace_name,
                });
                localStorage.setItem('access_token', res.access);
                localStorage.setItem('refresh_token', res.refresh);
                setSuccess(true);
                setTimeout(() => router.replace('/dashboard'), 2000);
            }
        } catch (err: unknown) {
            const e = err as { data?: Record<string, string[]>; message?: string };
            if (e.data) {
                // Map field-level errors from server
                const fieldErrors: Partial<typeof form> = {};
                for (const [k, v] of Object.entries(e.data)) {
                    fieldErrors[k as keyof typeof form] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(fieldErrors);
                if (e.data.non_field_errors) {
                    setApiError(e.data.non_field_errors[0]);
                }
            } else {
                setApiError(e.message ?? 'Something went wrong. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const field = (key: keyof typeof form) => ({
        value: form[key],
        onChange: (v: string) => {
            setForm(f => ({ ...f, [key]: v }));
            if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
        },
        error: errors[key],
    });

    // ── Loading: validating invite token ─────────────────────────────────────────

    if (inviteLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Validating invite...</p>
                </div>
            </div>
        );
    }

    // ── Invalid invite ────────────────────────────────────────────────────────────

    if (inviteToken && inviteError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
                        <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-7 w-7 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Invite Invalid</h2>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">{inviteError}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────────────

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
                        <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-7 w-7 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isInviteFlow ? 'You\'re in!' : 'Workspace created!'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-2">
                            {isInviteFlow
                                ? `Welcome to ${invite?.organization}. Redirecting...`
                                : 'Your personal workspace is ready. Redirecting...'
                            }
                        </p>
                        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full animate-[grow_2s_ease-in-out_forwards]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-blue-600">ScholaroScope</h1>
                    <p className="mt-2 text-gray-600">Academic Operations System</p>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-xl">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {isInviteFlow
                                ? (isExistingUser ? 'Accept Invitation' : 'Create Your Account')
                                : 'Create Workspace'
                            }
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {isInviteFlow
                                ? (isExistingUser
                                    ? 'Sign in to accept this invitation'
                                    : 'Fill in your details to join')
                                : 'Start your personal workspace — free forever'
                            }
                        </p>
                    </div>

                    {/* Invite banner */}
                    {isInviteFlow && invite && <InviteBanner invite={invite} />}

                    {/* API error */}
                    {apiError && (
                        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {apiError}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Full name — skip for existing user invite */}
                        {!isExistingUser && (
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    id="first_name"
                                    label="First Name"
                                    placeholder="Ada"
                                    {...field('first_name')}
                                />
                                <Field
                                    id="last_name"
                                    label="Last Name"
                                    placeholder="Lovelace"
                                    {...field('last_name')}
                                />
                            </div>
                        )}

                        {/* Email — pre-filled + locked if invite specifies email */}
                        <Field
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="ada@example.com"
                            disabled={isInviteFlow && !!invite?.email}
                            hint={isInviteFlow && !!invite?.email ? 'Email is fixed by the invite' : undefined}
                            {...field('email')}
                        />

                        {/* Password */}
                        <Field
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="Min. 8 characters"
                            {...field('password')}
                        />

                        {/* Workspace name — personal flow only */}
                        {isPersonalFlow && (
                            <Field
                                id="workspace_name"
                                label="Workspace Name"
                                placeholder="Ada's Tutoring Centre"
                                hint="This becomes your personal organization name"
                                {...field('workspace_name')}
                            />
                        )}

                        {/* Role badge — invite flow */}
                        {isInviteFlow && invite && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <User className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-sm text-gray-600">
                                    You'll join as <span className="font-medium text-gray-800">{ROLE_LABEL[invite.role] ?? invite.role}</span>
                                </span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting
                                ? 'Processing...'
                                : isInviteFlow
                                    ? (isExistingUser ? 'Accept & Sign In' : 'Create Account & Join')
                                    : 'Create Workspace'
                            }
                        </button>
                    </div>

                    {/* Footer links */}
                    <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                        <button
                            onClick={() => router.push('/login')}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to login
                        </button>
                        {isPersonalFlow && (
                            <span>
                                Have an invite?{' '}
                                <span className="text-gray-400 text-xs">Use the invite link directly</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>&copy; 2025 ScholaroScope. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}