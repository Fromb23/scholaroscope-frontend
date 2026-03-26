'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { authAPI } from '@/app/core/api/auth';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const { login, acceptInvite } = useAuth();

    const inviteToken = searchParams.get('invite');
    const orgName = searchParams.get('org');

    useEffect(() => {
        const inviteEmail = searchParams.get('email');
        if (inviteEmail) setEmail(inviteEmail);
    }, []);

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
            const e = err as { response?: { data?: { non_field_errors?: string[] } }; data?: { error?: { message?: string } } };
            setError(
                e?.data?.error?.message ||
                e?.response?.data?.non_field_errors?.[0] ||
                'Login failed. Please try again.'
            );
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
                            {error}
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
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
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