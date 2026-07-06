import { ReportSurfaceRouter } from '@/app/core/components/reports/ReportSurfaceRouter';
import { resolveReportSurface } from '@/app/core/components/reports/reportAccessPolicy';

export function ReportsPage() {
  void resolveReportSurface;
  return <ReportSurfaceRouter />;
}
