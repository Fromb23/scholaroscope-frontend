// app/(auth)/reset-password/[uid]/[token]/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  authAPI,
  passwordFieldErrorsFromError,
  resetCodeFromError,
  type ResetTokenCode,
} from '@/app/core/api/auth';
import { useSemanticPageTitle } from '@/app/core/pageIdentity/PageTitleProvider';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';

type ResetTokenState =
  | 'validating'
  | 'valid'
  | 'expired'
  | 'used'
  | 'superseded'
  | 'invalid'
  | 'unavailable';

function stateForCode(code: ResetTokenCode): ResetTokenState {
  return code.replace('password_reset_', '') as ResetTokenState;
}

function resetMessageForCode(code: Exclude<ResetTokenCode, 'password_reset_valid'>) {
  switch (code) {
    case 'password_reset_expired':
      return 'This password reset link has expired. Please request a new one.';
    case 'password_reset_used':
      return 'This password reset link has already been used. You can request another link if needed.';
    case 'password_reset_superseded':
      return 'A newer password reset link was requested. Use the most recent email or request another link.';
    case 'password_reset_invalid':
      return 'This password reset link is invalid. Please request a new one.';
  }
}

export function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  useSemanticPageTitle('Reset Password');
  const uid = params.uid as string;
  const token = params.token as string;

  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenState, setTokenState] = useState<ResetTokenState>('validating');
  const [tokenMessage, setTokenMessage] = useState('');
  const submittingRef = useRef(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.new_password) e.new_password = 'Required';
    else if (form.new_password.length < 8) e.new_password = 'Min 8 characters';
    if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (submittingRef.current || tokenState !== 'valid') return;
    if (!validate()) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      await authAPI.resetPassword({ uid, token, ...form });
      setForm({ new_password: '', confirm_password: '' });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const code = resetCodeFromError(err);
      if (code && code !== 'password_reset_valid') {
        setTokenState(stateForCode(code));
        setTokenMessage(resetMessageForCode(code));
        return;
      }
      const policyErrors = passwordFieldErrorsFromError(err);
      if (policyErrors.length > 0) {
        setErrors({ new_password: policyErrors.join(' ') });
      } else {
        setErrors({ general: 'Could not reset your password. Please try again.' });
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const validateToken = useCallback(async () => {
    setTokenState('validating');
    setTokenMessage('');
    try {
      const result = await authAPI.validateResetToken({ uid, token });
      if (result.code !== 'password_reset_valid' || result.valid !== true) {
        throw new Error('Unexpected reset validation response.');
      }
      setTokenState('valid');
    } catch (err: unknown) {
      const code = resetCodeFromError(err);
      if (code && code !== 'password_reset_valid') {
        setTokenState(stateForCode(code));
        setTokenMessage(resetMessageForCode(code));
      } else {
        setTokenState('unavailable');
        setTokenMessage('We couldn’t validate this reset link right now.');
      }
    }
  }, [uid, token]);

  useEffect(() => {
    void validateToken();
  }, [validateToken]);

  if (tokenState === 'validating') {
    return (
      <AuthFrame>
        <div className="theme-card rounded-2xl p-8 text-center">
          <p className="theme-muted text-sm">Validating reset link...</p>
        </div>
      </AuthFrame>
    );
  }

  if (tokenState !== 'valid') {
    return (
      <AuthFrame>
        <div className="theme-card space-y-3 rounded-2xl p-8 text-center">
          <p className="text-sm font-medium text-[color:var(--color-danger)]">
            {tokenMessage}
          </p>
          {tokenState === 'unavailable' && (
            <Button variant="secondary" className="w-full" onClick={() => void validateToken()}>
              Retry validation
            </Button>
          )}
          <a href="/forgot-password" className="theme-link block text-sm">
            Request a new link
          </a>
          <a href="/login" className="theme-link block text-sm">
            Back to login
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
