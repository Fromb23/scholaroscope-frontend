'use client';

import { AlertTriangle, Clock3, Info } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { ReportingSource } from '@/app/core/types/reporting';
import {
  getReportingSourceLabel,
  getReportingSourceVariant,
} from '@/app/core/lib/reportingPresentation';

interface ReportingSourceStateProps {
  reportingSource: ReportingSource;
  status?: string | null;
  note?: string | null;
}

export function ReportingSourceState({
  reportingSource,
  status,
  note,
}: ReportingSourceStateProps) {
  const Icon = reportingSource === 'cambridge_pending' ? Clock3 : reportingSource === 'unsupported' ? AlertTriangle : Info;
  const stateLabel = status
    ?? (reportingSource === 'cambridge_pending'
      ? 'pending'
      : reportingSource === 'unsupported'
        ? 'unsupported'
        : null);

  const defaultMessage = reportingSource === 'cambridge_pending'
    ? 'Cambridge reporting not implemented yet.'
    : reportingSource === 'unsupported'
      ? 'This curriculum does not expose a supported reporting adapter.'
      : note ?? 'No reporting payload is available for this section.';

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white p-2 text-gray-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {getReportingSourceLabel(reportingSource)}
            </p>
            {stateLabel && (
              <Badge variant={getReportingSourceVariant(reportingSource)}>
                {stateLabel}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {note ?? defaultMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
