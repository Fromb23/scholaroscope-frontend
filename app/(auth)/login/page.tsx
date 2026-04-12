'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        if (searchParams.get('reason') === 'suspended') {
            setError(
                'Your organization has been suspended. Contact your administrator for more information.'
            );
        }
    }, []);

    useEffect(() => {
        const inviteEmail = searchParams.get('email');
        if (inviteEmail) setEmail(inviteEmail);
    }, []);

    // ADD before handleSubmit
    const resolveErrorMessage = (data: Record<string, unknown>): string => {
        const state = data?.state as string;
        const errorCode = data?.error as string;

        if (errorCode === 'suspended' || state === 'ONLY_SUSPENDED') {
            const orgs = (data?.suspended_orgs as { org: string; role: string }[]) ?? [];
            return orgs.map(o =>
                o.role === 'ADMIN'
                    ? `'${o.org}' has been suspended. Contact platform support.`
                    : `'${o.org}' has been suspended. Contact your organization administrator.`
            ).join('\n');
        }

        if (errorCode === 'revoked' || state === 'ONLY_REVOKED') {
            const orgs = (data?.revoked_orgs as { org: string }[]) ?? [];
            return orgs.map(o =>
                `Your access to '${o.org}' has been revoked. Contact your organization administrator.`
            ).join('\n');
        }

        if (errorCode === 'mixed_inactive' || state === 'MIXED_INACTIVE') {
            const suspended = (data?.suspended_orgs as { org: string; role: string }[]) ?? [];
            const revoked = (data?.revoked_orgs as { org: string }[]) ?? [];
            const lines = [
                ...suspended.map(o =>
                    o.role === 'ADMIN'
                        ? `'${o.org}' has been suspended. Contact platform support.`
                        : `'${o.org}' has been suspended. Contact your organization administrator.`
                ),
                ...revoked.map(o =>
                    `Your access to '${o.org}' has been revoked. Contact your organization administrator.`
                ),
            ];
            return lines.join('\n');
        }

        if (errorCode === 'no_org') {
            return 'No active organization found. Contact your administrator.';
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
            } else {
                await login(email, password);
            }
            window.location.href = '/dashboard';
        } catch (err: unknown) {
            const e = err as { data?: Record<string, unknown>; message?: string };
            const data = e?.data ?? {};
            setError(resolveErrorMessage(data) || e?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-blue-600">ScholaroScope</h1>
                    <p className="mt-2 text-gray-600">Academic Operations System</p>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-xl">
                    <h2 className="mb-2 text-2xl font-semibold text-gray-800">
                        {inviteToken ? 'Sign in to accept invite' : 'Admin Login'}
                    </h2>

                    {inviteToken && orgName && (
                        <p className="mb-6 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            You've been invited to join <strong>{decodeURIComponent(orgName)}</strong>. Sign in to accept.
                        </p>
                    )}

                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                            {error.split('\n').map((line, i) => (
                                <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="admin@school.com"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => router.push('/forgot-password')}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? (inviteToken ? 'Signing in & accepting invite...' : 'Signing in...')
                                : (inviteToken ? 'Sign In & Accept Invite' : 'Sign In')
                            }
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>For assistance, contact your system administrator</p>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>&copy; {new Date().getFullYear()} ScholaroScope. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <LoadingSpinner message="Loading..." />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}