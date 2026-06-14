'use client';

import { useSearchParams } from 'next/navigation';
import { ClassSubjectReportPage } from '@/app/core/components/reports/ClassSubjectReportPage';
import {
  buildCohortReportHref,
  parsePositiveReportParam,
} from '@/app/core/components/reports/reportNavigation';

export default function Page() {
  const searchParams = useSearchParams();
  const cohortId = parsePositiveReportParam(
    searchParams.get('cohort') ?? searchParams.get('cohort_id'),
  );
  const termId = parsePositiveReportParam(searchParams.get('term'));

  return (
    <ClassSubjectReportPage
      cohortIdOverride={cohortId}
      fallbackReturnTo={cohortId ? buildCohortReportHref(cohortId, { term: termId }) : '/reports/cohorts'}
    />
  );
}
