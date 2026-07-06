'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { resolveReportSurface } from '@/app/core/components/reports/reportAccessPolicy';

interface AdminReportAccessGateProps {
  children: ReactNode;
}

export function AdminReportAccessGate({
  children,
}: AdminReportAccessGateProps) {
  const { user, activeRole, activeOrg, capabilities, loading } = useAuth();
  const surface = resolveReportSurface({
    user,
    activeRole,
    activeOrg,
    capabilities,
  });

  if (loading) {
    return <LoadingSpinner message="Checking report access..." />;
  }

  if (!user) {
    return null;
  }

  if (surface === 'institution') {
    return <>{children}</>;
  }

  return (
    <ErrorState
      fullScreen={false}
      message="You do not have access to this report."
    />
  );
}
