'use client';

import { useParams } from 'next/navigation';
import { SubjectsReportPage } from '@/app/core/components/reports/SubjectsReportPage';

export default function Page() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = Number(params.subjectId);

  return <SubjectsReportPage subjectIdFromRoute={Number.isFinite(subjectId) ? subjectId : null} />;
}
