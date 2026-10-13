import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/app/core/components/auth/ResetPasswordPage';

export const metadata: Metadata = {
    title: 'Reset Password',
};

export default function Page() {
    return <ResetPasswordPage />;
}
