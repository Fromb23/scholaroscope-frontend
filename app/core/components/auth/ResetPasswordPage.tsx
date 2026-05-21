// app/(auth)/reset-password/[uid]/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { authAPI } from '@/app/core/api/auth';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';

export function ResetPasswordPage() {
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
      <AuthFrame>
        <div className="theme-card rounded-2xl p-8 text-center">
          <p className="theme-muted text-sm">Validating reset link...</p>
        </div>
      </AuthFrame>
    );
  }

  if (!tokenValid) {
    return (
      <AuthFrame>
        <div className="theme-card space-y-3 rounded-2xl p-8 text-center">
          <p className="text-sm font-medium text-[color:var(--color-danger)]">
            This reset link is invalid or has already been used.
          </p>
          <a href="/forgot-password" className="theme-link block text-sm">
            Request a new one
          </a>
        </div>
      </AuthFrame>
    );
  }

  if (success) {
    return (
      <AuthFrame>
        <div className="theme-card space-y-3 rounded-2xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold theme-text">Password reset!</h1>
          <p className="theme-muted text-sm">Redirecting to login...</p>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div className={themeClasses.authShell}>
        <div className={themeClasses.authCard}>
          <div>
            <h1 className="text-2xl font-bold theme-text">Reset your password</h1>
            <p className="theme-muted mt-1 text-sm">Enter your new password below.</p>
          </div>
          <div className="mt-6 space-y-4">
            {errors.general && (
              <ErrorBanner
                message={errors.general}
                onDismiss={() => setErrors((current) => ({ ...current, general: '' }))}
              />
            )}
            <Input
              label="New Password"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
              error={errors.new_password}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
              error={errors.confirm_password}
            />
            <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </div>
        </div>
      </div>
    </AuthFrame>
  );
}
