// app/(auth)/reset-password/[uid]/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { authAPI } from '@/app/core/api/auth';

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const uid = params.uid as string;
    const token = params.token as string;

    const [form, setForm] = useState({ new_password: '', confirm_password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.new_password) e.new_password = 'Required';
        else if (form.new_password.length < 8) e.new_password = 'Min 8 characters';
        if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await authAPI.resetPassword({ uid, token, ...form });
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { error?: string } } };
            setErrors({ general: axiosErr?.response?.data?.error || 'Invalid or expired reset link.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const validateToken = async () => {
            try {
                await authAPI.validateResetToken({ uid, token });
                setTokenValid(true);
            } catch {
                setTokenValid(false);
            } finally {
                setValidating(false);
            }
        };
        validateToken();
    }, [uid, token]);

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-gray-500">Validating reset link...</p>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center space-y-3">
                    <p className="text-red-500 text-sm font-medium">This reset link is invalid or has already been used.</p>
                    <a href="/forgot-password" className="text-blue-600 text-sm block">
                        Request a new one
                    </a>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h1 className="text-xl font-bold text-gray-900">Password reset!</h1>
                    <p className="text-sm text-gray-500">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
                    <p className="text-gray-500 text-sm mt-1">Enter your new password below.</p>
                </div>
                <div className="space-y-4">
                    {errors.general && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {errors.general}
                        </p>
                    )}
                    <Input
                        label="New Password"
                        type="password"
                        value={form.new_password}
                        onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                        error={errors.new_password}
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={form.confirm_password}
                        onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                        error={errors.confirm_password}
                    />
                    <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset password'}
                    </Button>
                </div>
            </div>
        </div>
    );
}