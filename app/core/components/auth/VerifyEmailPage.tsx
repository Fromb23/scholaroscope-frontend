'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, MailCheck } from 'lucide-react';
import { AuthFrame } from '@/app/core/components/auth/AuthFrame';
import { Button } from '@/app/components/ui/Button';
import { authAPI } from '@/app/core/api/auth';
import { useAuth } from '@/app/context/AuthContext';

type VerifyState = 'verifying' | 'success' | 'expired' | 'invalid' | 'already_verified';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setState('invalid');
        setMessage('This verification link is invalid.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        if (cancelled) return;

        if (response.status === 'already_verified') {
          setState('already_verified');
          setMessage(response.message ?? 'This email is already verified.');
          setTimeout(() => router.replace('/login'), 1200);
          return;
        }

        setState('success');
        setMessage(response.message ?? 'Workspace activated. Redirecting...');
        setTimeout(() => router.replace('/dashboard'), 1200);
      } catch (err: unknown) {
        if (cancelled) return;
        const error = err as { data?: Record<string, unknown>; message?: string };
        const data = error.data ?? {};
        const code = data.code as string | undefined;
        setEmail(typeof data.email === 'string' ? data.email : '');
        setMessage(
          typeof data.message === 'string'
            ? data.message
            : 'We could not verify this email link.',
        );
        setState(code === 'email_verification_expired' ? 'expired' : 'invalid');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token, verifyEmail]);

  const canResend = state === 'expired' || state === 'invalid';

  return (
    <AuthFrame>
      <div className="theme-card mx-auto w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          {state === 'verifying' ? (
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          ) : state === 'success' || state === 'already_verified' ? (
            <CheckCircle className="h-7 w-7 text-green-600" />
          ) : state === 'expired' ? (
            <MailCheck className="h-7 w-7 text-amber-600" />
          ) : (
            <AlertCircle className="h-7 w-7 text-red-600" />
          )}
        </div>
        <h1 className="text-xl font-semibold theme-text">
          {state === 'verifying'
            ? 'Verifying email'
            : state === 'success'
              ? 'Workspace activated'
              : state === 'already_verified'
                ? 'Already verified'
                : state === 'expired'
                  ? 'Link expired'
                  : 'Invalid link'}
        </h1>
        <p className="theme-muted mt-2 text-sm">{message}</p>

        {resendMessage ? (
          <p className="theme-info-surface mt-4 rounded-lg px-3 py-2 text-sm">{resendMessage}</p>
        ) : null}

        {canResend ? (
          <div className="mt-6 space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              disabled={!email || resending}
              onClick={async () => {
                if (!email) return;
                setResending(true);
                setResendMessage(null);
                try {
                  const response = await authAPI.resendVerification(email);
                  setResendMessage(response.message);
                } catch {
                  setResendMessage('Could not resend verification email. Try again shortly.');
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/register')}>
              Back to register
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>
              Back to login
            </Button>
          </div>
        ) : null}
      </div>
    </AuthFrame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthFrame><div className="theme-card rounded-2xl p-8">Loading...</div></AuthFrame>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
