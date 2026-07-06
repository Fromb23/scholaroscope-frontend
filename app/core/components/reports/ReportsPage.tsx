import { ReportSurfaceRouterClient } from '@/app/core/components/reports/ReportSurfaceRouterClient';
import { resolveReportSurface } from '@/app/core/components/reports/reportAccessPolicy';

export function ReportsPage() {
  void resolveReportSurface;
  return <ReportSurfaceRouterClient />;
}
