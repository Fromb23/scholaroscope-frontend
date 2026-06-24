'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

interface AdminReportAccessGateProps {
  children: ReactNode;
}

export function AdminReportAccessGate({
  children,
}: AdminReportAccessGateProps) {
  const router = useRouter();
  const { user, activeRole, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || user.is_superadmin || activeRole === 'ADMIN') return;
    if (activeRole === 'INSTRUCTOR') {
      router.replace('/reports/instructor');
    }
  }, [activeRole, loading, router, user]);

  if (loading) {
    return <LoadingSpinner message="Checking report access..." />;
  }

  if (!user) {
    return null;
  }

  if (user.is_superadmin || activeRole === 'ADMIN') {
    return <>{children}</>;
  }

  if (activeRole === 'INSTRUCTOR') {
    return <LoadingSpinner message="Redirecting to instructor reports..." />;
  }

  return (
    <ErrorState
      fullScreen={false}
      message="You do not have access to this report."
    />
  );
}
