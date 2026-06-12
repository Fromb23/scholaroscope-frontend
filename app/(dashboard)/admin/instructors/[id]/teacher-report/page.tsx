'use client';

import { useParams } from 'next/navigation';
import { TeacherPerformanceReportPage } from '@/app/core/components/reports/TeacherPerformanceReportPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  const instructorId = Number(params.id);

  return (
    <TeacherPerformanceReportPage
      mode="admin"
      instructorId={Number.isFinite(instructorId) ? instructorId : null}
      returnTo={`/admin/instructors/${params.id}/progress`}
    />
  );
}
