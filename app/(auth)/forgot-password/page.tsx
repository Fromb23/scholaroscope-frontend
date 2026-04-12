// app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { authAPI } from '@/app/core/api/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!email.trim()) { setError('Email is required'); return; }
        setLoading(true); setError('');
        try {
            await authAPI.forgotPassword(email);
            setSubmitted(true);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Mail className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
                    <p className="text-gray-500 text-sm">
                        If an account exists for <strong>{email}</strong>, we sent a password reset link.
                    </p>
                    <Link href="/login">
                        <Button variant="secondary" className="mt-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />Back to login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Enter your email and we'll send you a reset link.
                    </p>
                </div>
                <div className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        error={error}
                        placeholder="you@example.com"
                    />
                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Send reset link'}
                    </Button>
                </div>
                <Link href="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-3.5 w-3.5" />Back to login
                </Link>
            </div>
        </div>
    );
}