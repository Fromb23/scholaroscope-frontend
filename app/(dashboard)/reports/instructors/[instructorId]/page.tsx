'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { TeacherPerformanceReportPage } from '@/app/core/components/reports/TeacherPerformanceReportPage';
import {
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';

export default function Page() {
  const params = useParams<{ instructorId: string }>();
  const searchParams = useSearchParams();
  const instructorId = Number(params.instructorId);
  const termId = parsePositiveReportParam(searchParams.get('term'));
  const returnTo = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: '/reports/instructors',
    fallbackState: { term: termId },
  });

  return (
    <TeacherPerformanceReportPage
      mode="admin"
      instructorId={Number.isFinite(instructorId) ? instructorId : null}
      returnTo={returnTo}
    />
  );
}
