'use client';

import { ClipboardList } from 'lucide-react';
import type { CbcStudentResult, CbcStudentSection } from '@/app/core/types/reporting';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  resolveCbcReadiness,
  resolveCbcStudentResult,
} from '@/app/core/lib/reportingPresentation';
import { Badge } from '@/app/components/ui/Badge';

interface CbcStudentResultSummaryProps {
  cbc: CbcStudentSection | CbcStudentResult | null | undefined;
}

export function CbcStudentResultSummary({
  cbc,
}: CbcStudentResultSummaryProps) {
  const result = resolveCbcStudentResult(cbc);
  const readiness = resolveCbcReadiness(cbc);

  if (!result) {
    return (
      <p className="text-sm text-gray-500">
        No CBC result is available yet.
      </p>
    );
  }

  const componentEntries = Object.entries(result.component_scores ?? {});
  const diagnosticEntries = Object.entries(result.diagnostic_scores ?? {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-medium text-gray-900">CBC Result</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="CBC Weighted Score" value={formatPercent(result.weighted_score)} />
        <Metric label="CBC Result Code" value={result.cbc_code ?? '—'} />
        <Metric label="CBC Level" value={result.cbc_level ?? '—'} />
        <Metric label="CBC Points" value={formatNumber(result.cbc_points)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Result Status" value={result.result_status ?? '—'} />
        <Metric label="Result Label" value={result.cbc_label ?? '—'} />
        <Metric label="Stale" value={result.is_stale ? 'Yes' : 'No'} />
        <Metric label="Computed At" value={formatDateTime(result.computed_at)} />
      </div>

      {readiness && (
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={readiness.has_result ? 'green' : 'yellow'}>
              {readiness.has_result ? 'Result available' : 'Awaiting result'}
            </Badge>
            <Badge variant={readiness.is_final ? 'blue' : 'yellow'}>
              {readiness.is_final ? 'Final' : 'Not final'}
            </Badge>
            {readiness.is_stale && (
              <Badge variant="orange">Stale</Badge>
            )}
          </div>
          {readiness.missing_components.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Missing components: {readiness.missing_components.join(', ')}
            </p>
          )}
        </div>
      )}

      {result.missing_components.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900">Missing Components</h4>
          <p className="mt-2 text-sm text-gray-600">
            {result.missing_components.join(', ')}
          </p>
        </div>
      )}

      {(componentEntries.length > 0 || diagnosticEntries.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <KeyValueList title="Component Scores" entries={componentEntries} />
          <KeyValueList title="Diagnostic Scores" entries={diagnosticEntries} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function KeyValueList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string | number | null]>;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="mt-2 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-sm text-gray-600">{key.replace(/_/g, ' ')}</span>
            <span className="text-sm font-medium text-gray-900">
              {typeof value === 'number' ? value.toFixed(1) : (value ?? '—')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
