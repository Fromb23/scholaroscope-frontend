'use client';

import { useAuth } from '@/app/context/AuthContext';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { FreelanceReportLandingPage } from '@/app/core/components/reports/FreelanceReportLandingPage';
import { InstructorReportsOverviewPage } from '@/app/core/components/reports/InstructorReportsOverviewPage';
import { ReportsPageClient } from '@/app/core/components/reports/ReportsPageClient';
import { resolveReportSurface } from '@/app/core/components/reports/reportAccessPolicy';

export function ReportSurfaceRouterClient() {
  const { user, activeRole, activeOrg, capabilities, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  const surface = resolveReportSurface({
    user,
    activeRole,
    activeOrg,
    capabilities,
  });

  if (surface === 'institution') {
    return <ReportsPageClient />;
  }

  if (surface === 'freelance') {
    return <FreelanceReportLandingPage />;
  }

  if (surface === 'instructor') {
    return <InstructorReportsOverviewPage />;
  }

  return (
    <ErrorState
      fullScreen={false}
      message="You do not have access to this report."
    />
  );
}
