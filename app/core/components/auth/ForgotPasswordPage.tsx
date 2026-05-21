// app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { authAPI } from '@/app/core/api/auth';
import { AuthFrame } from './AuthFrame';
import { themeClasses } from '@/app/core/theme/themeClasses';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
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
      <AuthFrame>
        <div className="theme-card w-full max-w-md space-y-4 rounded-2xl p-8 text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold theme-text">Check your email</h1>
          <p className="theme-muted text-sm">
            If an account exists for <strong>{email}</strong>, we sent a password reset link.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div className={themeClasses.authShell}>
        <div className={themeClasses.authCard}>
          <div>
            <h1 className="text-2xl font-bold theme-text">Forgot password?</h1>
            <p className="theme-muted mt-1 text-sm">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@example.com"
            />
            <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </div>
          <Link href="/login" className="theme-link mt-6 inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}
