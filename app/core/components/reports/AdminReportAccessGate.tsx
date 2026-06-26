'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  canRenderInstitutionReportOverview,
  shouldUseInstructorReportSurface,
} from '@/app/core/components/reports/reportAccessPolicy';

interface AdminReportAccessGateProps {
  children: ReactNode;
}

export function AdminReportAccessGate({
  children,
}: AdminReportAccessGateProps) {
  const router = useRouter();
  const { user, activeRole, activeOrg, capabilities, loading } = useAuth();
  const canRenderAdminReports = canRenderInstitutionReportOverview({
    user,
    activeRole,
    activeOrg,
    capabilities,
  });
  const useInstructorReports = shouldUseInstructorReportSurface({
    user,
    activeRole,
    activeOrg,
    capabilities,
  });

  useEffect(() => {
    if (loading || !user || canRenderAdminReports) return;
    if (useInstructorReports) {
      router.replace('/reports/instructor');
    }
  }, [canRenderAdminReports, loading, router, useInstructorReports, user]);

  if (loading) {
    return <LoadingSpinner message="Checking report access..." />;
  }

  if (!user) {
    return null;
  }

  if (canRenderAdminReports) {
    return <>{children}</>;
  }

  if (useInstructorReports) {
    return <LoadingSpinner message="Redirecting to instructor reports..." />;
  }

  return (
    <ErrorState
      fullScreen={false}
      message="You do not have access to this report."
    />
  );
}
