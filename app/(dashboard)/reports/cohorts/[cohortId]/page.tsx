'use client';

import { useParams } from 'next/navigation';
import { CohortsReportPage } from '@/app/core/components/reports/CohortsReportPage';

export default function Page() {
  const params = useParams<{ cohortId: string }>();
  const cohortId = Number(params.cohortId);

  return <CohortsReportPage cohortIdFromRoute={Number.isFinite(cohortId) ? cohortId : null} />;
}
