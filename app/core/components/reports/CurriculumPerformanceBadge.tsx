'use client';

import { Badge } from '@/app/components/ui/Badge';
import type { ReportingSource } from '@/app/core/types/reporting';
import {
  getReportingSourceLabel,
  getReportingSourceVariant,
} from '@/app/core/lib/reportingPresentation';

interface CurriculumPerformanceBadgeProps {
  reportingSource: ReportingSource;
}

export function CurriculumPerformanceBadge({
  reportingSource,
}: CurriculumPerformanceBadgeProps) {
  return (
    <Badge variant={getReportingSourceVariant(reportingSource)}>
      {getReportingSourceLabel(reportingSource)}
    </Badge>
  );
}
