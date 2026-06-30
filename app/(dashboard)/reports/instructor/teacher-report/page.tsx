import { TeacherPerformanceReportPage } from '@/app/core/components/reports/TeacherPerformanceReportPage';

export default function Page() {
  return (
    <TeacherPerformanceReportPage
      mode="self"
      returnTo="/reports/instructor"
    />
  );
}
