'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { TeacherPerformanceReportPage } from '@/app/core/components/reports/TeacherPerformanceReportPage';
import {
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';

export default function Page() {
  const params = useParams<{ instructorId: string }>();
  const searchParams = useSearchParams();
  const instructorId = parsePositiveReportParam(params.instructorId ?? null);
  const termId = parsePositiveReportParam(searchParams.get('term'));
  const returnTo = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: '/reports/instructors',
    fallbackState: { term: termId },
  });

  return (
    <AdminReportAccessGate>
      {instructorId ? (
        <TeacherPerformanceReportPage
          mode="admin"
          instructorId={instructorId}
          returnTo={returnTo}
        />
      ) : (
        <ErrorState
          fullScreen={false}
          message="Select an instructor from Instructor Reports to open a teacher report."
        />
      )}
    </AdminReportAccessGate>
  );
}
