'use client';

import { AlertTriangle, Clock3, Info } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { ReportingSource } from '@/app/core/types/reporting';
import {
  getReportingSourceLabel,
  getReportingStatusLabel,
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
    ? getReportingStatusLabel(status)
    : reportingSource === 'cambridge_pending'
      ? 'Pending'
      : reportingSource === 'unsupported'
        ? 'Unavailable'
        : null;

  const defaultMessage = reportingSource === 'cambridge_pending'
    ? 'Cambridge reports for this subject are still pending.'
    : reportingSource === 'unsupported'
      ? 'Reports are not available for this subject yet.'
      : note ?? 'This class view has no reporting data yet.';

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
