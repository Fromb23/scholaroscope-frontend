'use client';

import { useParams } from 'next/navigation';
import { StudentsReportPage } from '@/app/core/components/reports/StudentsReportPage';

export default function Page() {
  const params = useParams<{ studentId: string }>();
  const studentId = Number(params.studentId);

  return <StudentsReportPage studentIdFromRoute={Number.isFinite(studentId) ? studentId : null} />;
}
